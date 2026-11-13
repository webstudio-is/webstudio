import * as path from "node:path";
import { defaultClientConditions } from "vite";
import type { StorybookConfig } from "@storybook/react-vite";
import storySources from "./story-sources.json" with { type: "json" };
import { hasPrivateStorySources } from "./story-settings";

const repositoryRoot = path.resolve(__dirname, "..");

export default {
  stories: storySources,
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  addons: [
    "@storybook/addon-controls",
    "@storybook/addon-actions",
    "@storybook/addon-backgrounds",
    "@storybook/addon-toolbars",
  ],
  async viteFinal(config) {
    return {
      ...config,
      optimizeDeps: {
        exclude: ["scroll-timeline-polyfill"],
      },

      define: {
        ...config.define,
        // storybook use "util" package internally which is bundled with stories
        // and gives an error that process is undefined
        "process.env.NODE_DEBUG": "undefined",
        "process.env.IS_STROYBOOK": "true",
      },
      resolve: {
        ...config.resolve,
        conditions: hasPrivateStorySources(repositoryRoot)
          ? ["webstudio-private", "webstudio", ...defaultClientConditions]
          : ["webstudio", ...defaultClientConditions],

        alias: [
          {
            find: "~",
            replacement: path.resolve("./apps/builder/app"),
          },
        ],
      },
    };
  },
} satisfies StorybookConfig;
