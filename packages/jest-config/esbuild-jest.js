// inspired by https://github.com/aelbore/esbuild-jest

const { extname } = require("path");
const { transformSync } = require("esbuild");

const loaders = ["js", "jsx", "ts", "tsx", "json"];

const createTransformer = () => ({
  process(content, filename) {
    const ext = extname(filename).slice(1);
    const loader = loaders.includes(ext) ? ext : "text";

    const result = transformSync(content, {
      loader,
      jsx: "automatic",
      format: "esm",
      target: "es2022",
      // Sourcemaps are necessary for inline snapshots to work
      // See: https://github.com/aelbore/esbuild-jest#setting-up-jest-config-file-with-transformoptions
      sourcemap: true,
      sourcesContent: false,
      sourcefile: filename,
    });

    const map = {
      ...JSON.parse(result.map),
      sourcesContent: null,
    };

    // Append the inline sourcemap manually to ensure the "sourcesContent"
    // is null. Otherwise, breakpoints won't pause within the actual source.
    const code =
      result.code +
      "\n//# sourceMappingURL=data:application/json;base64," +
      Buffer.from(JSON.stringify(map)).toString("base64");

    return { code, map };
  },
});

module.exports = {
  canInstrument: true,
  createTransformer,
};
