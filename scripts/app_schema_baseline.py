"""Schema baseline for the App DB: build a new environment (UAT, prod, DR) from code.

    python scripts/app_schema_baseline.py live-point DSN          # last migration in the live ledger
    python scripts/app_schema_baseline.py snapshot DSN OUT_DIR    # schema.sql + platform_*.sql of a database
    python scripts/app_schema_baseline.py write SNAP_DIR --through VERSION
    python scripts/app_schema_baseline.py build DSN --upto VERSION [--project-ref REF]
    python scripts/app_schema_baseline.py restore SNAP_DIR DSN    # load a snapshot, to re-dump it
    python scripts/app_schema_baseline.py covers LIVE_PRE BUILT_PRE
    python scripts/app_schema_baseline.py scan FILE               # fail on anything like a secret

Why: Supabase's own migration history for this database is incomplete (changes were applied by
hand from May to Nov 2026; about half have no file in supabase/migrations, and the first five
weeks were never recorded). Replaying files cannot rebuild it. So a new environment starts from a
schema-only snapshot of live, and the schema-baseline workflow proves every day that a database
built from the snapshot plus later migrations is identical to live.

supabase/baseline/ holds, all generated, never edited by hand:
  platform_pre.sql   extensions and Ficium's own roles (NOLOGIN), needed before the schema
  schema.sql         pg_dump --schema-only of the Ficium schemas (no rows, so no client data)
  platform_post.sql  what lives in Supabase-managed schemas but is ours: storage buckets and
                     policies, triggers on auth.users, cron jobs, the realtime publication, and the
                     names (never values) of the Vault secrets the cron jobs read
  BASELINE           through (last ledger migration included), taken, sha256 of each file

The project URL inside cron commands is written as __PROJECT_REF__; `build` fills in the target's.
Pattern and normalisation follow ficium-portal-api/scripts/schema_baseline.py, which does the same
for the Portal DB.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import os
import re
import subprocess
import sys
from pathlib import Path

import psycopg2

ROOT = Path(__file__).resolve().parent.parent
BASELINE_DIR = ROOT / "supabase" / "baseline"
MIGRATIONS_DIR = ROOT / "supabase" / "migrations"
LEDGER_START = "20261116120000"  # keep in step with scripts/check-migrations.mjs

# Ficium-owned schemas on the App DB. Supabase-managed schemas are left to Supabase; what we put
# inside them is exported separately as platform_post.sql.
SCHEMAS = ("admin", "fico", "finance", "integration", "public", "vault_extract")

PG_IMAGE = "postgres:17-alpine"
DUMP_FLAGS = (
    "--schema-only",
    "--no-owner",
    "--no-publications",
    "--no-subscriptions",
    "--no-security-labels",
    "--no-tablespaces",
)
NAME = re.compile(r"^(\d{14})_[a-z0-9_]{1,80}\.sql$")
PROJECT_URL = re.compile(r"https://[a-z0-9-]+\.supabase\.co")
PROJECT_PLACEHOLDER = "https://__PROJECT_REF__.supabase.co"
SUPABASE_ROLES = {
    "anon", "authenticated", "authenticator", "dashboard_user", "pgbouncer", "postgres",
    "service_role", "supabase_admin", "supabase_auth_admin", "supabase_functions_admin",
    "supabase_read_only_user", "supabase_realtime_admin", "supabase_replication_admin",
    "supabase_storage_admin", "supabase_etl_admin", "cli_login_postgres",
}

PRE_SQL = r"""
with e as (
  select string_agg(format('CREATE EXTENSION IF NOT EXISTS %I WITH SCHEMA %I;', e.extname, n.nspname),
                    E'\n' order by e.extname) s
  from pg_extension e join pg_namespace n on n.oid = e.extnamespace
  where e.extname <> 'plpgsql'),
r as (
  select string_agg(format(
    'DO $r$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = %L) THEN CREATE ROLE %I NOLOGIN; END IF; END $r$;',
    rolname, rolname), E'\n' order by rolname) s
  from pg_roles
  where rolname !~ '^(pg_|supabase|cli_login)' and rolname <> all (%(builtin)s))
select concat_ws(E'\n\n',
  '-- Extensions', e.s,
  '-- Ficium roles (created NOLOGIN; give a login and password by hand where one is needed)',
  coalesce(r.s, '-- none')) || E'\n'
from e, r
"""

POST_SQL = r"""
with
b as (
  select string_agg(format(
    'INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES (%%L, %%L, %%L, %%s, %%s) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;',
    id, name, public, coalesce(file_size_limit::text, 'NULL'),
    coalesce(quote_literal(allowed_mime_types::text) || '::text[]', 'NULL')), E'\n' order by id) s
  from storage.buckets),
p as (
  select string_agg(format('CREATE POLICY %%I ON %%I.%%I AS %%s FOR %%s TO %%s%%s%%s;',
    policyname, schemaname, tablename, permissive, cmd,
    (select string_agg(case when r = 'public' then 'public' else quote_ident(r) end, ', ' order by r) from unnest(roles) r),
    case when qual is not null then ' USING (' || qual || ')' else '' end,
    case when with_check is not null then ' WITH CHECK (' || with_check || ')' else '' end),
    E'\n' order by schemaname, tablename, policyname) s
  from pg_policies where schemaname in ('storage', 'auth')),
t as (
  select string_agg(pg_get_triggerdef(tg.oid) || ';', E'\n' order by c.relname, tg.tgname) s
  from pg_trigger tg
  join pg_class c on c.oid = tg.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  join pg_proc f on f.oid = tg.tgfoid
  join pg_namespace fn on fn.oid = f.pronamespace
  where n.nspname in ('auth', 'storage') and not tg.tgisinternal
    and fn.nspname not in ('auth', 'storage', 'realtime', 'supabase_functions', 'extensions')),
j as (
  select string_agg(format('SELECT cron.schedule(%%L, %%L, %%L);', jobname, schedule, command),
                    E'\n' order by jobname) s
  from cron.job),
pub as (
  select string_agg(format('ALTER PUBLICATION supabase_realtime ADD TABLE %%I.%%I;', schemaname, tablename),
                    E'\n' order by schemaname, tablename) s
  from pg_publication_tables where pubname = 'supabase_realtime'),
v as (select string_agg(name, ', ' order by name) s from vault.secrets)
select concat_ws(E'\n\n',
  '-- Storage buckets', coalesce(b.s, '-- none'),
  '-- Policies on Supabase-managed tables (storage, auth)', coalesce(p.s, '-- none'),
  '-- Triggers on Supabase-managed tables that call Ficium functions', coalesce(t.s, '-- none'),
  '-- Cron jobs (commands read their secrets from Vault by name)', coalesce(j.s, '-- none'),
  '-- Realtime', coalesce(pub.s, '-- none'),
  '-- Vault secrets this database needs (names only; values come from Doppler): ' || coalesce(v.s, 'none')
) || E'\n'
from b, p, t, j, pub, v
"""

_DROP_LINE = re.compile(
    r"^(\\restrict |\\unrestrict |-- Dumped from database version|-- Dumped by pg_dump version)"
)
_SUPABASE_DEFAULTS = re.compile(r"^ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin ")
_SECRETS = {
    "JWT": re.compile(r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}"),
    "private key": re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY"),
    "Stripe key": re.compile(r"\b[sr]k_(live|test)_[0-9A-Za-z]{10,}"),
    "GitHub token": re.compile(r"\bgh[pousr]_[A-Za-z0-9]{30,}"),
    "AWS key id": re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    "Slack token": re.compile(r"\bxox[abprs]-[A-Za-z0-9-]{10,}"),
    "Resend key": re.compile(r"\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{8,}"),
    "DSN with password": re.compile(r"postgres(ql)?://[^:\s/]+:[^@\s]+@"),
    "Bearer token": re.compile(r"(?i)bearer [A-Za-z0-9._-]{20,}"),
}


# ── Database access ──────────────────────────────────────────────────────────


def connect(dsn: str):
    conn = psycopg2.connect(dsn, connect_timeout=20, application_name="ficium-app-schema-baseline")
    conn.autocommit = True
    return conn


def query_one(dsn: str, sql: str, params=None) -> str:
    conn = connect(dsn)
    try:
        with conn.cursor() as cur:
            cur.execute("set search_path = ''")  # every name in the output comes out qualified
            cur.execute(sql, params)
            row = cur.fetchone()
    finally:
        conn.close()
    return "" if not row or row[0] is None else str(row[0])


def run_script(dsn: str, text: str) -> None:
    conn = connect(dsn)
    try:
        with conn.cursor() as cur:
            # `text` is repository SQL (the baseline and supabase/migrations), never user input.
            # nosemgrep: python.lang.security.audit.formatted-sql-query.formatted-sql-query
            cur.execute(text)
    finally:
        conn.close()


def pg_dump(dsn: str) -> str:
    args = list(DUMP_FLAGS) + [f"--schema={s}" for s in SCHEMAS]
    exe = os.environ.get("SCHEMA_BASELINE_PG_DUMP")
    if exe:
        cmd, env = [exe, "--dbname", dsn, *args], None
    else:
        # Same pinned pg_dump for live and scratch, so their dumps are byte-comparable.
        # The DSN goes in through the environment, never on the command line.
        script = 'exec pg_dump --dbname "$PGDUMP_DSN" "$@"'
        cmd = ["docker", "run", "--rm", "--network", "host", "-e", "PGDUMP_DSN", PG_IMAGE]
        cmd += ["sh", "-c", script, "pg_dump", *args]
        env = {**os.environ, "PGDUMP_DSN": dsn}
    res = subprocess.run(cmd, capture_output=True, text=True, env=env)
    if res.returncode != 0:
        sys.exit(f"pg_dump failed: {res.stderr.strip()[:2000]}")
    return res.stdout


# ── Normalisation ────────────────────────────────────────────────────────────


def _sections(lines: list[str]) -> list[list[str]]:
    out: list[list[str]] = [[]]
    for i, line in enumerate(lines):
        nxt = lines[i + 1] if i + 1 < len(lines) else ""
        header = nxt.startswith("-- Name: ") and i + 2 < len(lines) and lines[i + 2] == "--"
        if line == "--" and (header or nxt.startswith("-- PostgreSQL database dump complete")):
            out.append([])
        out[-1].append(line)
    return out


def normalise(dump: str) -> str:
    kept = []
    for line in dump.splitlines():
        if _DROP_LINE.match(line) or _SUPABASE_DEFAULTS.match(line):
            continue
        if line == "CREATE SCHEMA public;":
            line = "CREATE SCHEMA IF NOT EXISTS public;"
        kept.append(line)
    out: list[str] = []
    for sec in _sections(kept):
        is_object = len(sec) >= 3 and sec[1].startswith("-- Name: ")
        if is_object and not any(ln.strip() for ln in sec[3:]):
            continue
        out.extend(sec)
    return re.sub(r"\n{3,}", "\n\n", "\n".join(out).strip() + "\n")


def platform_pre(dsn: str) -> str:
    builtin = "array[" + ", ".join(f"'{r}'" for r in sorted(SUPABASE_ROLES)) + "]"
    return query_one(dsn, PRE_SQL.replace("%(builtin)s", builtin))


def platform_post(dsn: str) -> str:
    return PROJECT_URL.sub(PROJECT_PLACEHOLDER, query_one(dsn, POST_SQL, ()))


def scan(text: str) -> list[tuple[int, str]]:
    return [
        (n, kind)
        for n, line in enumerate(text.splitlines(), 1)
        for kind, rx in _SECRETS.items()
        if rx.search(line)
    ]


def _sha(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


# ── Commands ─────────────────────────────────────────────────────────────────

FILES = ("platform_pre.sql", "schema.sql", "platform_post.sql")


def live_point(dsn: str) -> str:
    point = query_one(dsn, "select max(version) from admin.schema_migration")
    if not point:
        sys.exit("live ledger is empty")
    return point


def snapshot(dsn: str, out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    (out / "platform_pre.sql").write_text(platform_pre(dsn))
    (out / "schema.sql").write_text(normalise(pg_dump(dsn)))
    (out / "platform_post.sql").write_text(platform_post(dsn))
    for f in FILES:
        print(f"{f}: {len((out / f).read_text().splitlines())} lines")


def write(snap: Path, through: str, out_dir: Path | None = None) -> None:
    out_dir = out_dir or BASELINE_DIR
    out_dir.mkdir(parents=True, exist_ok=True)
    header = (
        "-- Ficium App DB baseline. GENERATED: do not edit by hand.\n"
        f"-- Through {through}. Regenerate with the schema-baseline workflow on a\n"
        "-- schema-baseline/* branch; see supabase/baseline/README.md.\n\n"
    )
    lines = [f"through: {through}", f"taken: {dt.datetime.now(dt.UTC).strftime('%Y-%m-%dT%H:%M:%SZ')}"]
    for f in FILES:
        body = (snap / f).read_text()
        if hits := scan(body):
            sys.exit(f"refusing to write {f}: possible secrets at lines {hits[:20]}")
        text = header + body
        (out_dir / f).write_text(text)
        lines.append(f"{f.removesuffix('.sql')}_sha256: {_sha(text)}")
    (out_dir / "BASELINE").write_text("\n".join(lines) + "\n")
    print(f"baseline written through {through}")


def _meta() -> dict[str, str]:
    path = BASELINE_DIR / "BASELINE"
    if not path.exists():
        sys.exit("no supabase/baseline/BASELINE: generate it on a schema-baseline/* branch")
    return dict(ln.split(": ", 1) for ln in path.read_text().splitlines() if ": " in ln)


def ledger_files() -> list[str]:
    names = sorted(p.name for p in MIGRATIONS_DIR.glob("*.sql") if NAME.match(p.name))
    return [n.removesuffix(".sql") for n in names if n[:14] >= LEDGER_START]


_VAULT_NAMES = re.compile(r"^-- Vault secrets this database needs .*?: (.*)$", re.M)
_EXT = re.compile(r"^CREATE EXTENSION IF NOT EXISTS (\S+) WITH SCHEMA (\S+);$")
PLACEHOLDER_SECRET = "__SET_FROM_DOPPLER__"


def _apply(dsn: str, texts: dict[str, str], project_ref: str, recorded: str = "") -> None:
    """One transaction: extensions and roles, the schema, ledger rows, then platform objects.

    Vault secrets the cron jobs read are created by name with a placeholder value when missing;
    set the real values from Doppler before the jobs are relied on.
    """
    post = texts["platform_post.sql"].replace(PROJECT_PLACEHOLDER, f"https://{project_ref}.supabase.co")
    m = _VAULT_NAMES.search(post)
    names = [] if not m or m.group(1) == "none" else [n.strip() for n in m.group(1).split(",")]
    secrets = "\n".join(
        "DO $v$ BEGIN IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = "
        f"'{n}') THEN PERFORM vault.create_secret('{PLACEHOLDER_SECRET}', '{n}'); END IF; END $v$;"
        for n in names
    )
    publication = (
        "DO $p$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') "
        "THEN CREATE PUBLICATION supabase_realtime; END IF; END $p$;"
    )
    run_script(
        dsn,
        "BEGIN;\n" + texts["platform_pre.sql"] + "\n" + texts["schema.sql"] + "\n" + recorded
        + "\n" + publication + "\n" + secrets + "\n" + post + "\nCOMMIT;\n",
    )
    if names:
        print(f"vault secrets to set from Doppler: {', '.join(names)}")


def restore(snap: Path, dsn: str, project_ref: str) -> None:
    """Load a snapshot (from `snapshot`) into an empty Supabase database, to dump it again.

    Live is dumped through the Supabase pooler; restoring and re-dumping on a direct connection
    removes any difference in how the two were dumped (see the portal script's --canonical).
    """
    _apply(dsn, {f: (snap / f).read_text() for f in FILES}, project_ref)
    print(f"restored {snap}")


def build(dsn: str, upto: str, project_ref: str) -> None:
    """Build an empty Supabase database: the baseline, then every later migration up to `upto`."""
    meta = _meta()
    through = meta["through"]
    texts = {}
    for f in FILES:
        text = (BASELINE_DIR / f).read_text()
        if meta.get(f"{f.removesuffix('.sql')}_sha256") != _sha(text):
            sys.exit(f"supabase/baseline/{f} does not match BASELINE: regenerate it, never hand-edit")
        texts[f] = text
    versions = ledger_files()
    if through not in versions or upto not in versions or upto < through:
        sys.exit(f"--upto {upto} must be a migration at or after the baseline ({through})")
    # Versions are file names already matched against NAME (digits, a-z, _), so they are safe to
    # inline; migration_applied() is the ledger's own recorder.
    recorded = "\n".join(
        f"SELECT admin.migration_applied('{v}');" for v in versions if v <= through
    )
    _apply(dsn, texts, project_ref, recorded)
    print(f"baseline applied (through {through})")
    for v in versions:
        if through < v <= upto:
            run_script(dsn, (MIGRATIONS_DIR / f"{v}.sql").read_text())
            print(f"applied {v}")


def apply_after(dsn: str, after: str) -> None:
    """Apply, in order, every ledger migration newer than `after` (merged, not yet on live)."""
    pending = [v for v in ledger_files() if v > after]
    for v in pending:
        run_script(dsn, (MIGRATIONS_DIR / f"{v}.sql").read_text())
        print(f"applied {v}")
    if not pending:
        print("nothing merged that live has not run")


def covers(live: Path, built: Path) -> int:
    """platform_pre: every extension and role live has must exist on the built database.

    The built side may have more (Supabase's image installs its own defaults). An extension in a
    different schema is reported but does not fail: functions call it by its own schema.
    """
    def ext(text: str) -> dict[str, str]:
        return {m.group(1): m.group(2) for ln in text.splitlines() if (m := _EXT.match(ln))}

    def roles(text: str) -> set[str]:
        return {ln for ln in text.splitlines() if ln.startswith("DO $r$")}

    lt, bt = live.read_text(), built.read_text()
    le, be = ext(lt), ext(bt)
    missing = [e for e in le if e not in be] + sorted(roles(lt) - roles(bt))
    for e, schema in le.items():
        if e in be and be[e] != schema:
            print(f"note: extension {e} is in {schema} on live, {be[e]} on the built database")
    for m in missing:
        print(f"missing on the built database: {m}")
    return 1 if missing else 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("live-point")
    p.add_argument("dsn")
    p = sub.add_parser("snapshot")
    p.add_argument("dsn")
    p.add_argument("out", type=Path)
    p = sub.add_parser("write")
    p.add_argument("snap", type=Path)
    p.add_argument("--through", required=True)
    p = sub.add_parser("build")
    p.add_argument("dsn")
    p.add_argument("--upto", required=True)
    p.add_argument("--project-ref", default="scratch")
    p = sub.add_parser("restore")
    p.add_argument("snap", type=Path)
    p.add_argument("dsn")
    p.add_argument("--project-ref", default="scratch")
    p = sub.add_parser("apply-after")
    p.add_argument("dsn")
    p.add_argument("--after", required=True)
    p = sub.add_parser("covers")
    p.add_argument("live", type=Path)
    p.add_argument("built", type=Path)
    p = sub.add_parser("scan")
    p.add_argument("file", type=Path)
    a = ap.parse_args(argv)

    if a.cmd == "live-point":
        print(live_point(a.dsn))
    elif a.cmd == "snapshot":
        snapshot(a.dsn, a.out)
    elif a.cmd == "write":
        write(a.snap, a.through)
    elif a.cmd == "build":
        build(a.dsn, a.upto, a.project_ref)
    elif a.cmd == "restore":
        restore(a.snap, a.dsn, a.project_ref)
    elif a.cmd == "apply-after":
        apply_after(a.dsn, a.after)
    elif a.cmd == "covers":
        return covers(a.live, a.built)
    elif a.cmd == "scan":
        hits = scan(a.file.read_text())
        for n, kind in hits:
            print(f"{a.file}:{n}: possible {kind}")
        return 1 if hits else 0
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
