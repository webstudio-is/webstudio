module.exports = {
  stories: ["../src/**/*.stories.mdx", "../src/**/*.stories.@(js|jsx|ts|tsx)"],
  framework: "@storybook/react",
  addons: ["@storybook/addon-essentials", "@storybook/addon-links"],
  features: {
    storyStoreV7: true,
  },
  core: {
    builder: "@storybook/builder-vite",
  },
};
