import { createRequire } from "node:module";
import { copyFile, mkdir, readFile, realpath, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build, type Plugin } from "esbuild";
import { hasPrivateStorySources } from "../../.storybook/story-settings";

const visualRoot = path.dirname(fileURLToPath(import.meta.url));
const previewModuleId = "virtual:webstudio-visual-preview";
const storyModulesId = "virtual:webstudio-visual-story-modules";

const createVisualModulesPlugin = ({
  root,
  storyFiles,
}: {
  root: string;
  storyFiles: readonly string[];
}): Plugin => {
  const modules = storyFiles
    .map(
      (file) =>
        `${JSON.stringify(`/${file}`)}: () => import(${JSON.stringify(
          path.join(root, file)
        )})`
    )
    .join(",\n");
  const virtualModules = new Map([
    [
      previewModuleId,
      `export { default } from ${JSON.stringify(
        path.join(root, ".storybook/preview.tsx")
      )};`,
    ],
    [storyModulesId, `export const modules = {${modules}};`],
  ]);
  return {
    name: "webstudio-visual-modules",
    setup(esbuild) {
      esbuild.onResolve({ filter: /^virtual:webstudio-visual-/ }, (args) => ({
        path: args.path,
        namespace: "webstudio-visual",
      }));
      esbuild.onLoad(
        { filter: /.*/, namespace: "webstudio-visual" },
        (args) => ({
          contents: virtualModules.get(args.path),
          loader: "js",
          resolveDir: root,
        })
      );
    },
  };
};

const createUrlAssetPlugin = (root: string): Plugin => {
  const require = createRequire(path.join(root, "package.json"));
  return {
    name: "webstudio-url-assets",
    setup(esbuild) {
      esbuild.onResolve({ filter: /\?url$/ }, (args) => {
        const request = args.path.slice(0, -"?url".length);
        let file: string;
        if (request.startsWith("~/")) {
          file = path.join(root, "apps/builder/app", request.slice(2));
        } else if (request.startsWith(".")) {
          file = path.resolve(args.resolveDir, request);
        } else if (path.isAbsolute(request)) {
          file = request;
        } else {
          file = require.resolve(request, { paths: [args.resolveDir] });
        }
        return { path: file, namespace: "url-asset" };
      });
      esbuild.onLoad(
        { filter: /.*/, namespace: "url-asset" },
        async (args) => ({
          contents: await readFile(args.path),
          loader: "file",
        })
      );
    },
  };
};

export const buildVisualStoryApp = async ({
  root,
  outputDirectory,
  storyFiles,
}: {
  root: string;
  outputDirectory: string;
  storyFiles: readonly string[];
}) => {
  const resolvedRoot = await realpath(root);
  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });
  await copyFile(
    path.join(visualRoot, "index.html"),
    path.join(outputDirectory, "index.html")
  );
  await build({
    absWorkingDir: resolvedRoot,
    alias: { "~": path.join(resolvedRoot, "apps/builder/app") },
    assetNames: "assets/[name]-[hash]",
    bundle: true,
    chunkNames: "chunks/[name]-[hash]",
    conditions: [
      ...(hasPrivateStorySources(resolvedRoot) ? ["webstudio-private"] : []),
      "webstudio",
      "browser",
    ],
    define: {
      "import.meta.env": "{}",
      "process.env.NODE_DEBUG": "undefined",
      "process.env.IS_STROYBOOK": "true",
    },
    entryNames: "harness",
    stdin: {
      contents: await readFile(path.join(visualRoot, "harness.tsx"), "utf8"),
      loader: "tsx",
      resolveDir: resolvedRoot,
      sourcefile: "harness.tsx",
    },
    format: "esm",
    jsx: "automatic",
    loader: {
      ".gif": "file",
      ".jpeg": "file",
      ".jpg": "file",
      ".png": "file",
      ".svg": "file",
      ".webp": "file",
      ".woff": "file",
      ".woff2": "file",
    },
    logLevel: "warning",
    mainFields: ["browser", "module", "main"],
    minify: true,
    outdir: outputDirectory,
    platform: "browser",
    plugins: [
      createVisualModulesPlugin({
        root: resolvedRoot,
        storyFiles: [...new Set(storyFiles)].sort(),
      }),
      createUrlAssetPlugin(resolvedRoot),
    ],
    splitting: true,
    target: "es2022",
  });
};
