# Visual regression testing

The visual regression runner builds the visual-testing Storybook from the merge
base and from the current working tree, then compares every story in Chromium.
It does not require stored baseline images.

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

The HTML report shows the expected, actual, and diff images for every mismatch,
including an image slider. CI uploads the same report as the
`visual-regression-report` artifact.

Pixel sensitivity, viewport settings, and retries are configured in
`playwright.config.ts`. Story-specific settling delays and deterministic
rendering options belong in `story-options.ts`.

Visual differences fail the pull request. After reviewing an intentional
change, add the `visual-change-approved` label to rerun the same comparison as
approved. A new commit removes that approval. Fork pull requests run only after
the `safe-to-deploy` label is added.
