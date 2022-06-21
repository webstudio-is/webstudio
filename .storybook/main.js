module.exports = {
  stories: ["../app/**/*.stories.mdx", "../app/**/*.stories.@(jsx|ts|tsx)"],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
  ],
  framework: "@storybook/react",
};
