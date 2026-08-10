# Visual regression testing

The visual regression runner indexes the existing Storybook CSF files, bundles
them with a lightweight esbuild harness, and renders the merge base and current
working tree in Chromium. It compares screenshots with Webstudio's shared
vision engine and does not require stored baseline images or a hosted service.

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

Pixel sensitivity and mismatch tolerance are configured near the top of
`run.ts`. Viewport and capture settings live in `capture.ts`. Add
story-specific settling and deterministic rendering options to the story's
`parameters.visualRegression` object.

Story scopes are data in `.storybook/story-sources.json`. Each compared
revision loads its own copy so removing or changing a scope remains visible to
the comparison.

GitHub Actions runs the complete suite in one job. The runner keeps an ignored
baseline worktree in the operating system's temporary directory so subsequent
local runs can reuse its dependencies.

Visual differences fail the pull request. After reviewing an intentional
change, add the `visual-change-approved` label to rerun the same comparison as
approved. A new commit removes that approval. Fork pull requests run only after
the `safe-to-deploy` label is added.
