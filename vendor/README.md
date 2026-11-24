# Vendored packages

`ficium-integration` is private, so `@ficium/contract` is installed from a
tarball here rather than from GitHub. CI, Vercel and local installs then need
no GitHub token, and the lockfile pins its exact SHA-512. ficium-portal-api
does the same with the Python wheel (`vendor/ficium_contract-*.whl`).

| File | Built from |
|---|---|
| `ficium-contract-1.10.0.tgz` | `Ficium001/ficium-integration` tag `v1.10.0` (`b0db327`), `npm ci && npm pack` |

To upgrade: in ficium-integration, check out the new tag, run `npm ci && npm pack`,
copy the `.tgz` here, point `@ficium/contract` in `package.json` at it
(`file:vendor/ficium-contract-<version>.tgz`), run `npm install`, and delete the
old tarball.
