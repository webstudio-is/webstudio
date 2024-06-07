import * as path from "node:path";
import type { StorybookConfig } from "@storybook/react-vite";

const visualTestingStories: StorybookConfig["stories"] = [
  {
    directory: "../apps/builder",
    titlePrefix: "Builder",
  },
  {
    directory: "../packages/design-system",
    titlePrefix: "Design System",
  },
];

export default {
  stories: process.env.VISUAL_TESTING
    ? visualTestingStories
    : [
        ...visualTestingStories,
        {
          directory: "../packages/css-engine",
          titlePrefix: "Css Engine",
        },
        {
          directory: "../packages/image",
          titlePrefix: "Image",
        },
        {
          directory: "../packages/icons",
          titlePrefix: "Icons",
        },
        {
          directory: "../packages/sdk-components-react",
          titlePrefix: "Sdk Components React",
        },
        {
          directory: "../packages/sdk-components-react-radix",
          titlePrefix: "Sdk Components React Radix",
        },
      ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  addons: ["@storybook/addon-essentials", "@storybook/addon-links"],
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
        conditions: ["webstudio", "import", "module", "browser", "default"],
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
