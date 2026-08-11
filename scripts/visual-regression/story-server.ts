import { createServer as createHttpServer } from "node:http";
import { createRequire } from "node:module";
import { mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { build, type Plugin } from "esbuild";
import { hasPrivateStorySources } from "../../.storybook/story-settings";

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      html, body, #root { min-height: 100%; }
      body { margin: 0; pointer-events: none; }
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        caret-color: transparent !important;
        transition: none !important;
      }
      iframe { visibility: hidden !important; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <link rel="stylesheet" href="/harness.css">
    <script type="module" src="/harness.js"></script>
  </body>
</html>`;

const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const startStaticServer = async ({
  directory,
  port,
}: {
  directory: string;
  port: number;
}) => {
  const resolvedDirectory = path.resolve(directory);
  const server = createHttpServer(async (request, response) => {
    try {
      const requestPath = new URL(
        request.url ?? "/",
        `http://127.0.0.1:${port}`
      ).pathname;
      const relativePath =
        requestPath === "/__visual/"
          ? ".visual-regression/harness.html"
          : requestPath.slice(1);
      const file = path.resolve(resolvedDirectory, relativePath);
      if (file.startsWith(`${resolvedDirectory}${path.sep}`) === false) {
        response.statusCode = 403;
        response.end("Forbidden");
        return;
      }
      const contents = await readFile(file);
      response.statusCode = 200;
      response.setHeader(
        "Content-Type",
        contentTypes[path.extname(file)] ?? "application/octet-stream"
      );
      response.end(contents);
    } catch {
      response.statusCode = 404;
      response.end("Not found");
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  return server;
};

// Bundle Storybook CSF modules without starting the Storybook application.
export const startVisualStoryServer = async ({
  root,
  port,
  outputDirectory,
  storyFiles,
}: {
  root: string;
  port: number;
  outputDirectory: string;
  storyFiles: readonly string[];
}) => {
  const resolvedRoot = await realpath(root);
  const resolvedStoryFiles = [...new Set(storyFiles)].sort();
  const storyModules = resolvedStoryFiles
    .map(
      (file) =>
        `${JSON.stringify(`/${file}`)}: () => import(${JSON.stringify(path.join(resolvedRoot, file))})`
    )
    .join(",\n");
  const harnessSource = await readFile(
    new URL("./harness.tsx", import.meta.url),
    "utf8"
  );
  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(path.join(outputDirectory, ".visual-regression"), {
    recursive: true,
  });
  await writeFile(
    path.join(outputDirectory, ".visual-regression", "harness.html"),
    html
  );

  const require = createRequire(path.join(resolvedRoot, "package.json"));
  const visualModulesPlugin: Plugin = {
    name: "visual-modules",
    setup(esbuild) {
      esbuild.onResolve({ filter: /^visual:preview$/ }, () => ({
        path: "preview",
        namespace: "visual",
      }));
      esbuild.onResolve({ filter: /^visual:story-modules$/ }, () => ({
        path: "story-modules",
        namespace: "visual",
      }));
      esbuild.onLoad({ filter: /^preview$/, namespace: "visual" }, () => ({
        contents: `export { default } from ${JSON.stringify(path.join(resolvedRoot, ".storybook/preview.tsx"))};`,
        loader: "js",
        resolveDir: resolvedRoot,
      }));
      esbuild.onLoad(
        { filter: /^story-modules$/, namespace: "visual" },
        () => ({
          contents: `export const modules = {${storyModules}};`,
          loader: "js",
          resolveDir: resolvedRoot,
        })
      );
    },
  };
  const urlAssetPlugin: Plugin = {
    name: "url-assets",
    setup(esbuild) {
      esbuild.onResolve({ filter: /\?url$/ }, (args) => {
        const request = args.path.slice(0, -"?url".length);
        let file: string;
        if (request.startsWith("~/")) {
          file = path.join(resolvedRoot, "apps/builder/app", request.slice(2));
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
      contents: harnessSource,
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
    plugins: [visualModulesPlugin, urlAssetPlugin],
    splitting: true,
    target: "es2022",
  });
  const httpServer = await startStaticServer({
    directory: outputDirectory,
    port,
  });
  return {
    async close() {
      await new Promise<void>((resolve, reject) => {
        httpServer.close((error) =>
          error === undefined ? resolve() : reject(error)
        );
      });
    },
  };
};
