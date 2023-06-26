import path from "path";
import type { StorybookConfig } from "@storybook/react-vite";
import storybookConfig from "@webstudio-is/storybook-config";

export default {
  ...storybookConfig,
  stories: ["../app/**/*.stories.mdx", "../app/**/*.stories.@(jsx|ts|tsx)"],
  async viteFinal(config) {
    return {
      ...config,
      define: {
        ...config.define,
        // storybook use "util" package internally which is bundled with stories
        // and gives and error that process is undefined
        "process.env.NODE_DEBUG": "undefined",
      },
      resolve: {
        ...config.resolve,
        conditions: ["source", "import", "module", "browser", "default"],
        alias: [
          {
            find: "~",
            replacement: path.resolve(__dirname, "../app"),
          },
        ],
      },
    };
  },
} satisfies StorybookConfig;
