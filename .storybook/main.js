const path = require("path");

module.exports = {
  stories: ["../app/**/*.stories.mdx", "../app/**/*.stories.@(jsx|ts|tsx)"],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
  ],
  framework: "@storybook/react",
  webpackFinal: async (config) => {
    config.resolve.alias["~"] = path.resolve(__dirname, "../app");
    return config;
  },
};
