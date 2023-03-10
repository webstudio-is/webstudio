const path = require("path");
const storybookConfig = require("@webstudio-is/storybook-config");

module.exports = {
  ...storybookConfig,
  stories: ["../app/**/*.stories.mdx", "../app/**/*.stories.@(jsx|ts|tsx)"],
  async viteFinal(config) {
    return {
      ...config,
      resolve: {
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
};
