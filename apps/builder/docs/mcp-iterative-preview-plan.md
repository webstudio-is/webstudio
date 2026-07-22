# Fast MCP iterative preview plan

## Problem

Agents make many small site edits and need a screenshot after each one. The
current MCP path treats every committed mutation as invalidating a production
preview. The next path-based screenshot then:

1. writes the current project-session snapshot;
2. regenerates the preview project;
3. runs the React Router production build through Vite;
4. stops and restarts the production server;
5. closes and relaunches the reusable browser session; and
6. navigates and captures the page.

This is correct for final production-like verification, but unnecessarily
expensive for an iterative edit-and-inspect loop.

## Measured baseline

Measurements used the source CLI on macOS with Node 22.22.1 and the repository's
authenticated local evaluation fixture. One `mcp run` process owned the project
session, preview server, and browser. The sequence was refresh, preview start,
two screenshots, a committed text edit, preview start, two more screenshots,
and preview stop.

| Operation                                                    |                Elapsed time |
| ------------------------------------------------------------ | --------------------------: |
| Session refresh                                              |                    14-16 ms |
| Initial production preview generation, build, and start      |                   2.5-2.9 s |
| First screenshot with a cold browser                         |                   9.1-9.2 s |
| Unchanged screenshot with the browser and preview reused     |                       1.1 s |
| Committed text edit                                          |                    24-25 ms |
| Post-edit regeneration, production build, and server restart |                       7.9 s |
| First screenshot after preview restart                       |                       9.1 s |
| Post-edit screenshot when rebuild and capture are combined   |                      17.1 s |
| Complete measured workflow                                   | 36.4-37.0 s reported by MCP |

The edit is not the bottleneck. The dominant post-edit cost is rebuilding and
restarting the generated app, followed by relaunching the browser that was
closed when preview restarted. An unchanged screenshot already demonstrates
that warm capture can complete in about one second.

The benchmark used an explicitly allocated port. The host supports `port: 0`
as an available-port request, while the public MCP schema currently rejects
zero. That contract mismatch is independent of iterative preview latency and
should be handled separately.

### Production homepage measurement

A second measurement used the production Webstudio homepage through its
authenticated preview share link. The project contained 43 routes and 266 text
nodes on the homepage. The supplied token was read-only, so the benchmark did
not alter production and could not directly execute a post-edit screenshot.

| Operation                                            | Elapsed time |
| ---------------------------------------------------- | -----------: |
| CLI/MCP startup before the run                       |        2.1 s |
| Remote project refresh                               |        3.1 s |
| Generated preview preparation                        |        5.2 s |
| Production build, server start, and readiness        |       10.9 s |
| Complete production preview preparation/start        |       16.0 s |
| First homepage screenshot with a cold browser        |       10.2 s |
| Unchanged homepage screenshot with everything reused |       1.36 s |
| Preview and browser shutdown                         |        5.3 s |
| Complete measured five-call run reported by MCP      |       36.7 s |

Because a stale path screenshot performs the same preview preparation/start
and cold-browser capture in sequence, the measured current cost of the first
screenshot after an edit is approximately **26.2 seconds** on this homepage,
plus the mutation itself. This is an inference from the separately measured
phases, not a claimed production mutation: the read-only token correctly
rejected the attempted semantic no-op update. A subsequent screenshot without
another mutation takes about 1.36 seconds.

## Architectural decision

Introduce two explicit preview lifecycles with one shared controller contract:

- **Iterative preview** uses the generated React Router app's Vite development
  server. It stays alive across project mutations and recompiles changed
  generated files. This is the default for MCP path screenshots and ordinary
  `preview.start` calls intended for authoring.
- **Production preview** keeps the current generate, production build, and
  production server path. Rendered audits and explicit final verification use
  this mode because they need production-like output and build metrics.

Both modes continue to render the generated Webstudio application. The
iterative mode must not render Builder UI, bypass the compiler, or introduce a
second project-state interpretation.

## Implementation plan

### 1. Model preview mode and ownership

- Add a `mode: "iterative" | "production"` preview option and controller state.
- Keep one owner per MCP process and reject incompatible host, port, project,
  image-domain, or mode changes unless an explicit restart is requested.
- Make path screenshots select iterative mode by default when they own preview.
- Make rendered audit select production mode explicitly.
- Preserve explicit `baseUrl` screenshots as capture-only operations with no
  generation or server lifecycle changes.

### 2. Keep the iterative server alive

- Start the generated template's existing `react-router dev` command once with
  the selected host and port.
- Do not run `npm run build` or `npm run start` for iterative refreshes.
- Do not close the screenshot browser session when only generated project data
  changed.
- Restart only for configuration changes that the running development server
  cannot safely absorb, such as a different project, preview mode, host, port,
  dependency manifest, or image-domain policy.

### 3. Regenerate safely after mutations

- Continue deriving generated output from the authoritative project-session
  snapshot and the existing prebuild/compiler pipeline.
- Split one-time preview workspace setup and dependency installation from
  repeatable project generation.
- Write changed generated files atomically so Vite never observes a partial
  module graph.
- Serialize generation and coalesce multiple mutations that arrive before the
  next screenshot into one refresh for the newest committed project version.
- Preserve the existing build cache key for production preview. Track the
  iterative server's loaded project version separately instead of treating a
  production build marker as development-server freshness.

### 4. Add an explicit freshness handshake

- Include project id and committed project version in generated-page metadata
  or a generated readiness endpoint.
- After regeneration, wait for Vite to accept the new module graph and for the
  requested page to report the expected project version before capturing.
- Reload or navigate the retained browser page only after the new version is
  available; do not rely on an arbitrary timeout or merely receiving HTTP 200.
- Return the rendered project version and preview mode in screenshot metadata
  so agents and tests can distinguish current evidence from stale evidence.
- On generation or compilation failure, keep the server process diagnosable,
  return a bounded error with Vite diagnostics, and never report a stale
  screenshot as current.

### 5. Preserve production verification

- Keep production preview behavior and generated build metrics unchanged for
  rendered audit and explicit production checks.
- Ensure switching from iterative to production mode performs one deliberate
  lifecycle transition and invalidates incompatible readiness state.
- Document the agent loop: use iterative screenshots while authoring, then run
  production rendered audit or production preview once for final verification.

### 6. Add observability and budgets

- Report bounded phase timings for generation, compiler readiness, browser
  navigation/readiness, and screenshot encoding.
- Do not include project content, URLs with credentials, or generated source in
  lifecycle logs.
- Add the edit-to-screenshot benchmark to the local agent evaluation suite so
  changes affecting CLI, MCP, generation, or screenshots can be checked with
  `pnpm evaluations` without adding it to CI.

## Test plan

### Unit tests

- Preview mode selects the correct process command and environment.
- A project mutation refreshes an iterative preview without stopping its
  process or browser session.
- Production mode still uses build and start, and reuses matching build cache
  markers.
- Restart decisions cover project, mode, host, port, image domains, and
  dependency-manifest changes.
- Generation is serialized, rapid invalidations are coalesced, and the newest
  committed version wins.
- Readiness rejects stale versions, compilation errors, wrong projects, exited
  servers, and timeouts.

### Integration tests

- Run a real generated fixture through iterative preview, mutate visible text,
  capture again, and assert the new text and project version without changing
  the preview PID or browser session.
- Repeat for styles, route creation/removal, assets, fonts, responsive
  breakpoints, and draft pages.
- Apply several mutations before capture and verify one refresh renders the
  final state.
- Verify iterative-to-production switching and a complete rendered audit.
- Verify cleanup after cancellation, MCP disconnect, compilation failure, and
  preview stop.

### Agent evaluation

- Give a minimally prompted agent an existing page and ask for three small
  visible revisions with screenshot inspection after each revision.
- Assert every screenshot reflects the immediately preceding committed version.
- Retain phase timings and process/session identifiers as local evaluation
  evidence.

## Acceptance criteria

- A warm screenshot after a committed small text or style edit does not invoke
  `npm run build`, `npm run start`, or launch a new browser.
- On the repository fixture and reference development machine, warm
  edit-to-screenshot latency is at most 3 seconds at p95 across ten sequential
  edits, compared with the measured 17.1-second baseline.
- An unchanged warm screenshot remains at most 2 seconds at p95.
- Every screenshot reports and renders the expected committed project version;
  stale screenshots fail rather than silently succeeding.
- Rendered audit remains production-based and retains its current deterministic
  build, capture, and artifact contract.
- Existing external-URL and `baseUrl` screenshot behavior remains unchanged.
- Unit, integration, complete local agent evaluations, formatting, lint, and
  type checks pass before implementation is delivered.

## Non-goals

- Replacing the generated React Router application with Builder canvas output.
- Making rendered audit use a development server.
- Persisting a preview or browser process across unrelated CLI/MCP processes.
- Implementing incremental compiler semantics independently of the existing
  generation pipeline before measurement proves full regeneration is a
  bottleneck after production build and browser restart are removed.
