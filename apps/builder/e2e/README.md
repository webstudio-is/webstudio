# Builder e2e

## Fast local reruns

Use the full command for CI-like validation:

```sh
pnpm e2e:builder
```

The first run after the migrations change applies the regular migration
pipeline and writes an ignored schema cache under `.cache/builder-e2e`.
Subsequent runs in the same checkout restore that cache. CI does not preserve
it between runs. Refresh it explicitly with:

```sh
pnpm e2e:builder:refresh-schema-cache
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

Use `E2E_TEST_FILTERS` for a newline-separated list of exact or substring
matches. Each entry is matched against both the test name and
`<suite> › <test>`.

```sh
E2E_TEST_FILTERS='Builder can insert through the engine bridge
Builder-created data variables and resources persist' pnpm e2e:builder
```

CI shards the full e2e suite by file name tags such as
`pages-actions.[shard-3].e2e.ts`. Use `E2E_TEST_SHARD=shard-3` to run one shard.
The goal is to keep all coverage while preventing one long serial e2e command
from hitting the command timeout.

When adding a new e2e file, include one shard tag in the filename:

```txt
my-workflow.[shard-1].e2e.ts
my-workflow.[shard-2].e2e.ts
my-workflow.[shard-3].e2e.ts
```

If one workflow file grows too slow, split it by scenario into files with the
same base name and different shard tags:

```txt
large-workflow.[shard-1].e2e.ts
large-workflow.[shard-2].e2e.ts
large-workflow.[shard-3].e2e.ts
```

Choose the shard by current CI timing, not by feature ownership. Put new or
expensive files into the fastest shard, and rebalance later by renaming files.
CI retries a failed shard once because a single shard rerun is cheap enough to
absorb occasional browser/backend flakes.

CI discovers its shard matrix directly from these filename tags. When one test
file contains enough serial work to dominate a shard, add more shard tags to
that filename. Its tests are distributed deterministically across those shards
without duplicating the file or its helpers:

```txt
large-workflow.[shard-2].[shard-5].[shard-6].e2e.ts
```

`pnpm e2e:builder:dev` defaults to `E2E_BUILDER_URL=https://127.0.0.1:3000`,
so it runs against the already-running Vite dev server instead of building and
serving the production bundle. Override `E2E_BUILDER_URL` when the dev server is
running on another port. The E2E harness maps `wstd.dev` and project subdomains
to loopback for Chromium when this URL is loopback, so focused local runs do not
require machine-level host-file edits.

The dev backend uses `E2E_DB_BOOTSTRAP=if-empty` and keeps Docker containers
running. The e2e runner still resets test data before each run.

When you need a clean backend:

```sh
E2E_SKIP_CLEANUP=false pnpm e2e:builder
```
