const path = require("path");

module.exports = {
  stories: ["../app/**/*.stories.mdx", "../app/**/*.stories.@(jsx|ts|tsx)"],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
  ],
  features: {
    storyStoreV7: true,
  },
  core: {
    builder: {
      name: "webpack5",
      options: {
        lazyCompilation: true,
        fsCache: true,
      },
    },
  },
  framework: "@storybook/react",
  webpackFinal: async (config) => {
    config.resolve.alias["~"] = path.resolve(__dirname, "../app");
    // fix packages modules withoot extensions
    for (const rule of config.module.rules) {
      rule.resolve = rule.resolve || {};
      rule.resolve.fullySpecified = false;
    }
    return config;
  },
  features: {
    previewCsfV3: true,
  },
};
