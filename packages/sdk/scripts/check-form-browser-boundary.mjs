import { build } from "esbuild";

const result = await build({
  entryPoints: ["src/form/browser.ts"],
  bundle: true,
  platform: "browser",
  format: "esm",
  packages: "external",
  write: false,
  metafile: true,
});

const modules = [
  ...Object.keys(result.metafile.inputs),
  ...Object.values(result.metafile.outputs).flatMap((output) =>
    output.imports.map((entry) => entry.path)
  ),
];
const forbidden = modules.filter((module) =>
  /(?:^|[/@-])(react|router|node|protected-resource-fetch|resource-loader|email-resource|server)(?:[/.-]|$)/i.test(
    module
  )
);
if (forbidden.length > 0) {
  throw new Error(
    `Form browser entry crosses the delivery boundary: ${forbidden.join(", ")}`
  );
}
console.info(`Form browser boundary: ${modules.length} modules checked`);
