# Visual regression testing

The visual regression runner indexes the existing Storybook CSF files, builds a
lightweight browser app with esbuild, serves it through Vite, and renders the
merge base and current working tree in Chromium. It compares screenshots with
Webstudio's shared vision engine and does not require a hosted service.

Run the full comparison and open the visual report:

```sh
pnpm visual-regression:ui
```

Limit a local run while working on one area:

```sh
pnpm visual-regression:ui -- --grep "Design system/Button"
```

Use `--base <ref>` to compare with a branch other than `origin/main`. Reopen the
most recent report without rerunning the comparison with
`pnpm visual-regression:report`.

The HTML report shows baseline, current, and diff images for every mismatch,
plus OCR evidence for changed text. CI uploads the same self-contained report
as a `visual-regression-report` artifact.

Pixel sensitivity (`0.1`) and mismatch tolerance (`0.001%`) are configured near
the top of `run.ts`. Viewport and capture settings live in `capture.ts`. Add
story-specific deterministic rendering options to the story's
`parameters.visualRegression` object. Intervals and Web Animations are disabled
by default after React effects settle so concurrent screenshots cannot capture
different frames. External iframe contents are hidden because their rendering
is outside the revision under test. Set `disableAnimations: false` or
`disableIntervals: false` only when a story establishes its own deterministic
state.

Story scopes are data in `.storybook/story-sources.json`. Each compared
revision loads its own copy so removing or changing a scope remains visible to
the comparison.

GitHub Actions runs the complete suite in one job and caches screenshots from
successful revisions for use as PR baselines. The runner produces the baseline
on the fly when the cache is missing, and keeps both the cache and a reusable
baseline worktree ignored locally. CI uses the Playwright Chromium version
pinned by the lockfile so those screenshots remain reusable across hosted
runners. Changes anywhere in the visual harness or shared vision source
automatically invalidate cached screenshots. Capture concurrency adapts to the
available CPUs and can be overridden with `VISUAL_CAPTURE_CONCURRENCY`.

Visual differences fail the pull request. After reviewing an intentional
change, add the `visual-change-approved` label to rerun the same comparison as
approved. A new commit removes that approval. Fork pull requests run only after
the `safe-to-deploy` label is added.
