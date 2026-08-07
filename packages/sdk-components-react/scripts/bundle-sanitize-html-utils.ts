import { build } from "esbuild";
import { fileURLToPath } from "node:url";

export const bundleSanitizeHtml = ({ outfile }: { outfile: string }) =>
  build({
    entryPoints: [
      fileURLToPath(new URL("../src/sanitize-html.ts", import.meta.url)),
    ],
    bundle: true,
    format: "esm",
    minify: true,
    outfile,
    platform: "browser",
  });
