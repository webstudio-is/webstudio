export const visualRegressionConfig = {
  servers: {
    baselinePort: 6101,
    currentPort: 6102,
  },
  capture: {
    viewport: { width: 1280, height: 800 },
    timeout: 90_000,
    settleTime: 250,
    concurrency: { minimum: 5, maximum: 8 },
  },
  comparison: {
    pixelThreshold: 0.1,
    maxMismatchPercentage: 0.001,
    concurrency: 4,
  },
  cache: {
    include: [
      ".storybook/preview.tsx",
      ".storybook/story-settings.ts",
      ".storybook/story-sources.json",
      "packages/vision/src/**/*",
      "scripts/visual-regression/**/*",
      "pnpm-lock.yaml",
    ],
    exclude: [
      "**/*.test.*",
      "**/*.test-utils.*",
      "**/*.d.ts",
      "**/*.md",
      "**/tsconfig.json",
      "**/__snapshots__/**",
    ],
  },
} as const;
