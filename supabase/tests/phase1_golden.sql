-- Re-run any time integration.phase1_from_row / py_round1 change. Needs pg_net. Fixtures: public contract repo, generated FROM THE
-- REAL PYTHON BUILDER (ficium-portal-api scripts/gen_phase1_fixtures.py). Expect: rounding different = 0, builder different = 0.
SELECT net.http_get(url := 'https://raw.githubusercontent.com/Ficium001/ficium-integration/main/fixtures/phase1/rounding.json', timeout_milliseconds := 30000) AS rounding_req,
       net.http_get(url := 'https://raw.githubusercontent.com/Ficium001/ficium-integration/main/fixtures/phase1/cases.json',    timeout_milliseconds := 30000) AS cases_req;
-- then, with the two ids above:
-- WITH src AS (SELECT content::jsonb AS j FROM net._http_response WHERE id = <rounding_req>),
--      t AS (SELECT (e->>0)::float8 AS x, (e->>1)::float8 AS want FROM src, jsonb_array_elements(src.j->'cases') e)
-- SELECT count(*) AS cases, count(*) FILTER (WHERE integration.py_round1(x) IS DISTINCT FROM want) AS different FROM t;
-- WITH src AS (SELECT content::jsonb AS j FROM net._http_response WHERE id = <cases_req>),
--      c AS (SELECT e->'input' AS input, e->'expected' AS expected FROM src, jsonb_array_elements(src.j->'cases') e)
-- SELECT count(*) AS cases, count(*) FILTER (WHERE integration.phase1_from_row(input) <> expected) AS different FROM c;
