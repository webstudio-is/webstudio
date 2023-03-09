module.exports = {
  stories: ["../src/**/*.stories.mdx", "../src/**/*.stories.@(js|jsx|ts|tsx)"],
  framework: "@storybook/react",
  addons: ["@storybook/addon-essentials", "@storybook/addon-links"],
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
  webpackFinal: async (config) => {
    // fix packages modules withoot extensions
    for (const rule of config.module.rules) {
      rule.resolve = rule.resolve || {};
      rule.resolve.fullySpecified = false;
    }
    return config;
  },
};
