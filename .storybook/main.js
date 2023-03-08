if (!process.env.DEPLOYED_URLS) {
  throw new Error("process.env.DEPLOYED_URLS is not set");
}

const urls = JSON.parse(process.env.DEPLOYED_URLS);

module.exports = {
  // at least one story is required: https://github.com/storybookjs/storybook/issues/12705
  stories: ["./whole-repo.stories.js"],
  refs: Object.fromEntries(
    Object.entries(urls).map(([key, url]) => [
      key,
      { title: key, url, expanded: false },
    ])
  ),
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
};
