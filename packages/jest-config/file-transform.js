const last = (arr) => arr[arr.length - 1];

module.exports = {
  process(src, filename) {
    return `module.exports = ${JSON.stringify(last(filename.split("/")))};`;
  },
};
