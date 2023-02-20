const path = require("path");
const storybookConfig = require("@webstudio-is/storybook-config");

module.exports = {
  ...storybookConfig,
  stories: ["../app/**/*.stories.mdx", "../app/**/*.stories.@(jsx|ts|tsx)"],
  webpackFinal: async (config) => {
    config = await storybookConfig.webpackFinal(config);
    config.resolve.alias["~"] = path.resolve(__dirname, "../app");
    return config;
  },
};
