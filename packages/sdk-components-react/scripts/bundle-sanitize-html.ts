import { fileURLToPath } from "node:url";
import { bundleSanitizeHtml } from "./bundle-sanitize-html-utils";

await bundleSanitizeHtml({
  outfile: fileURLToPath(new URL("../lib/sanitize-html.js", import.meta.url)),
});
