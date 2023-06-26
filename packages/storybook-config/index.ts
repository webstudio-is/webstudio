import type { StorybookConfig } from "@storybook/react-vite";

export default {
  stories: ["../src/**/*.stories.mdx", "../src/**/*.stories.@(js|jsx|ts|tsx)"],
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
        conditions: ["source", "import", "module", "browser", "default"],
      },
    };
  },
} satisfies StorybookConfig;
