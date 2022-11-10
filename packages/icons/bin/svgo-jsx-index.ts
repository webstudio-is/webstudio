import * as fs from "fs/promises";
import * as path from "path";

(async () => {
  try {
    const list = await fs.readdir(path.join(process.cwd(), "./src/gen"));
    let result = "";
    for (let name of list) {
      name = path.basename(name, path.extname(name));
      result += `export * from "./${name}";\n`;
    }
    await fs.writeFile(path.join(process.cwd(), "./src/gen/index.ts"), result);
  } catch (error) {
    console.error(error);
  }
})();
