const fs = require("fs/promises");
const path = require("path");

(async () => {
  try {
    const list = await fs.readdir(path.join(__dirname, "./src/gen"));
    let result = "";
    for (let name of list) {
      name = path.basename(name, path.extname(name));
      result += `export * from './${name}';\n`;
    }
    await fs.writeFile(path.join(__dirname, "./src/gen/index.ts"), result);
  } catch (error) {
    console.error(error);
  }
})();
