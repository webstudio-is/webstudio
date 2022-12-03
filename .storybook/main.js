// const urls = {
//   "css-engine": "https://638245275c0366cdfc707b3e-vgrgustujb.chromatic.com/",
//   "designer-app": "https://6382151c8b47d4399fb9fc69-zxwosanrxy.chromatic.com/",
//   "design-system": "https://638245578b47d4399fba191a-rbsvnglxvz.chromatic.com/",
//   icons: "https://63824572e49212e991cb3f8b-ydvylgkybx.chromatic.com/",
//   image: "https://6382458c8d61b8a05151a300-jgzbrmsouh.chromatic.com/",
//   "react-sdk": "https://638245a7e49212e991cb3f8c-nfknjxkilc.chromatic.com/",
// };

const urls = process.env.DEPLOYED_URLS;

console.log("urls", urls);
console.log("stringified", JSON.stringify(urls));
throw new Error("stop");

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
};
