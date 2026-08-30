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

Pass normal Playwright Test arguments after `--`. For example:

```sh
pnpm e2e:builder -- --grep "Builder can copy, duplicate, and delete a page"
pnpm e2e:builder -- apps/builder/e2e/tests/pages-actions.e2e.ts
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
- Use the `page` fixture for the workflow under test. `e2e/test.ts` gives it an
  isolated context and closes that context automatically.
- Use Playwright's `context` fixture for setup state that must not leak into the
  workflow page, such as creating a project as its owner.
- Use `withBrowserContext(browser, callback)` for setup that must run in
  `beforeAll`. If cookies must survive from `beforeAll` into the tests, create
  an explicit context with `newBrowserContext(browser)` and close it in
  `afterAll`.
- Use `newIsolatedPage(browser)` for identities that must not share cookies.
- Keep tests in a file independent even though Playwright runs them in
  declaration order by default.

CI uses Playwright's standard six-way file sharding:

```sh
pnpm e2e:builder -- --shard=1/6
```

Test filenames do not encode shard ownership. Playwright balances files across
the configured shards.

## Failures

CI retries a failed shard once against a clean disposable database. It preserves
the first attempt's Playwright HTML report, traces, screenshots, and videos in a
separate artifact even when the retry passes. If the retry also fails, CI
uploads its artifacts and the backend service logs as well.

When you need a completely clean backend locally:

```sh
E2E_SKIP_CLEANUP=false pnpm e2e:builder
```
