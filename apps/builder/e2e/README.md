# Builder E2E tests

Builder E2E workflows run with Playwright Test. The Playwright setup project
waits for PostgREST, resets the disposable database, and warms the login route
before Chromium runs the selected tests.

## Run the suite

Use the full command for CI-like validation:

```sh
pnpm e2e:builder
```

The first run after migrations change applies the regular migration pipeline
and writes an ignored schema cache under `.cache/builder-e2e`. Refresh it
explicitly with:

```sh
pnpm e2e:builder:refresh-schema-cache
```

The regular E2E suite uses lightweight PostgreSQL containers. Verify that the
complete migration chain also applies to the pinned Supabase PostgreSQL image
with:

```sh
pnpm e2e:builder:check-supabase-migrations
```

Pass normal Playwright Test arguments after `--`. For example:

```sh
pnpm e2e:builder -- --grep "Builder can copy, duplicate, and delete a page"
pnpm e2e:builder -- 'apps/builder/e2e/tests/pages-actions.[shard-5].e2e.ts'
pnpm e2e:builder -- --debug --grep "Builder can copy"
```

A lightweight Playwright discovery pass validates the selection before Docker,
database migrations, browser installation, or the Builder build starts. A
filter that matches no tests therefore fails without starting the test
environment.

## Fast local reruns

Keep the E2E backend and Builder development server running to avoid rebuilding
Builder and restarting Docker for each edit.

Terminal 1:

```sh
pnpm e2e:builder:dev:backend
```

Terminal 2:

```sh
pnpm dev
```

Terminal 3:

```sh
pnpm e2e:builder:dev -- --grep "Builder can copy, duplicate, and delete a page"
```

`pnpm e2e:builder:dev` defaults to
`E2E_BUILDER_URL=https://127.0.0.1:3000`. Override it when the development
server uses another port. Chromium maps `wstd.dev` and its project subdomains
to loopback for local Builder URLs, so host-file changes are unnecessary.

The development backend uses `E2E_DB_BOOTSTRAP=if-empty` and keeps Docker
containers running. The Playwright setup project still resets test data before
each invocation.

## Test organization

- Put workflows in `e2e/tests/*.e2e.ts` and import `test` from `e2e/test.ts`.
- Use Playwright's `page` fixture for the workflow under test. Playwright gives
  each test an isolated context and closes it automatically.
- Use Playwright's `context` fixture when setup should share authentication with
  the workflow page.
- Use `withBrowserContext(browser, callback)` for isolated setup or setup that
  runs in `beforeAll`. If cookies must survive from `beforeAll` into the tests,
  create an explicit context with `newBrowserContext(browser)` and close it in
  `afterAll`.
- Use `newIsolatedPage(browser)` for identities that must not share cookies.
- Keep tests in a file independent even though Playwright runs them in
  declaration order by default.

CI discovers isolated Playwright shards from filename tags. Each shard uses two
workers, and files are assigned by measured CI duration to keep jobs near three
to four minutes:

```txt
pages-actions.[shard-2].[shard-5].[shard-6].e2e.ts
```

Every E2E filename must contain at least one shard tag. CI derives its matrix
from those tags, so adding or removing a shard does not require editing the
workflow. Files with multiple tags are partitioned across those shards. All
files selected by a shard must use the same set of tags. Rebalance by changing
filename tags when measured job durations drift. Suites may opt into parallel
mode only when every worker creates uniquely named setup data and the tests do
not depend on each other's mutations.

## Failures

Failed shard jobs upload the Playwright HTML report, traces, screenshots,
videos, and backend service logs.

When you need a completely clean backend locally:

```sh
E2E_SKIP_CLEANUP=false pnpm e2e:builder
```
