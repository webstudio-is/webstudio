import { StorybookConfig } from "@storybook/react-vite";

export default {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  addons: ["@storybook/addon-essentials"],
  async viteFinal(config) {
    return {
      ...config,
      resolve: {
        conditions: ["source", "import", "module", "browser", "default"],
      },
    };
  },
} satisfies StorybookConfig;
