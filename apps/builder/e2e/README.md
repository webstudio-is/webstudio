# Builder e2e

## Fast local reruns

Use the full command for CI-like validation:

```sh
pnpm e2e:builder
```

For local test authoring, keep the e2e backend and Builder dev server running
and rerun only the matching test. This avoids rebuilding Builder and avoids
restarting Docker for every edit.

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
E2E_TEST_FILTER="Builder can copy, duplicate, and delete a page" pnpm e2e:builder:dev
```

`E2E_TEST_FILTER` is a substring match against the test name. It is not a
regular expression. If the filter matches no tests, the runner fails and prints
the available test names before starting Docker or building Builder.

`pnpm e2e:builder:dev` defaults to `E2E_BUILDER_URL=https://127.0.0.1:3000`,
so it runs against the already-running Vite dev server instead of building and
serving the production bundle. Override `E2E_BUILDER_URL` when the dev server is
running on another port.

The dev backend uses `E2E_DB_BOOTSTRAP=if-empty` and keeps Docker containers
running. The e2e runner still resets test data before each run.

When you need a clean backend:

```sh
E2E_SKIP_CLEANUP=false pnpm e2e:builder
```
