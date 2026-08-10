import * as path from "node:path";
import { existsSync, readdirSync } from "node:fs";
import { defaultClientConditions } from "vite";
import type { StorybookConfig } from "@storybook/react-vite";
import { storySources } from "./story-sources";

const isFolderEmpty = (folderPath: string) => {
  if (!existsSync(folderPath)) {
    return true; // Folder does not exist
  }
  const contents = readdirSync(folderPath);

  return contents.length === 0;
};

const hasPrivateFolders = !isFolderEmpty(
  path.join(__dirname, "../../packages/sdk-components-animation/private-src")
);

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
        conditions: hasPrivateFolders
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
