/** @type {import('@ladle/react').UserConfig} */
export default {
  stories: [
    "apps/builder/app/**/*.stories.tsx",
    "packages/design-system/src/components/**/*.stories.tsx",
    "packages/css-engine/src/**/*.stories.tsx",
    "packages/image/src/**/*.stories.tsx",
    "packages/icons/src/**/*.stories.tsx",
    "packages/sdk-components-react/src/**/*.stories.tsx",
    "packages/sdk-components-react-radix/src/**/*.stories.tsx",
    "packages/sdk-components-animation/private-src/**/*.stories.tsx",
  ],
  viteConfig: process.cwd() + "/vite.ladle.config.ts",
  host: "0.0.0.0",
  port: 6006,
  outDir: "ladle-build",
  addons: {
    a11y: { enabled: false },
    action: { enabled: true, defaultState: [] },
    control: { enabled: true, defaultState: {} },
    mode: { enabled: true, defaultState: "full" },
    rtl: { enabled: false },
    source: { enabled: true, defaultState: false },
    theme: { enabled: true, defaultState: "light" },
    width: { enabled: true, defaultState: 0 },
  },
};
