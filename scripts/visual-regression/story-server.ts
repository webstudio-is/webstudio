import { createServer as createHttpServer } from "node:http";
import { createRequire } from "node:module";
import {
  glob,
  mkdir,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { build, type Plugin } from "esbuild";

const storyPatterns = [
  "apps/builder/**/*.stories.tsx",
  "packages/design-system/src/components/**/*.stories.tsx",
] as const;

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
    </style>
  </head>
  <body>
    <div id="root"></div>
    <link rel="stylesheet" href="/harness.css">
    <script type="module" src="/harness.js"></script>
  </body>
</html>`;

const browserModule = `
import React from "react";
import { createRoot } from "react-dom/client";
import { composeStories, setProjectAnnotations } from "@storybook/react";
__PREVIEW_IMPORT__

const modules = __STORY_MODULES__;

setProjectAnnotations(preview);

const markReady = async () => {
  await Promise.race([
    document.fonts.ready,
    new Promise((resolve) => window.setTimeout(resolve, 2_000)),
  ]);
  document.activeElement?.blur();
  await new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  );
  const ready = document.createElement("div");
  ready.id = "visual-ready";
  ready.hidden = true;
  document.body.append(ready);
};

const showError = (error) => {
  document.querySelector("#visual-ready")?.remove();
  document.querySelector("#visual-error")?.remove();
  const output = document.createElement("pre");
  output.id = "visual-error";
  output.textContent = error instanceof Error ? error.stack : String(error);
  document.body.append(output);
};
window.showVisualError = showError;

window.addEventListener("error", (event) => showError(event.error ?? event.message));
window.addEventListener("unhandledrejection", (event) => showError(event.reason));

const rootElement = document.querySelector("#root");
if (rootElement === null) {
  throw new Error("Visual story root is missing");
}
const root = createRoot(rootElement);
const originalSetInterval = window.setInterval;
const visualStyle = document.createElement("style");
document.head.append(visualStyle);

window.renderVisualStory = async ({
  file,
  exportName,
  title,
  disableIntervals,
  hideSelectors = [],
}) => {
  document.querySelector("#visual-ready")?.remove();
  document.querySelector("#visual-error")?.remove();
  document.body.style.background = "";
  visualStyle.textContent = hideSelectors
    .map((selector) => selector + " { visibility: hidden !important; }")
    .join("\\n");
  window.setInterval = disableIntervals ? () => 0 : originalSetInterval;
  const load = modules[\`/\${file}\`];
  if (load === undefined) {
    throw new Error(\`Visual story module not found: \${file}\`);
  }
  const module = await load();
  const stories = composeStories({
    ...module,
    default: { ...module.default, title },
  });
  const Story = stories[exportName];
  if (Story === undefined) {
    throw new Error(\`Visual story export not found: \${exportName}\`);
  }

  const backgrounds = Story.parameters?.backgrounds;
  const background = backgrounds?.values?.find(
    ({ name }) => name === backgrounds.default
  );
  if (background?.value !== undefined) {
    document.body.style.background = background.value;
  }

  root.render(React.createElement(Story));
  await markReady();
};

const params = new URLSearchParams(window.location.search);
if (params.has("file")) {
  window.renderVisualStory({
    file: params.get("file"),
    exportName: params.get("exportName"),
    title: params.get("title"),
    disableIntervals: params.get("disableIntervals") === "true",
  }).catch(showError);
}
`;

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

const globFiles = async (pattern: string, cwd: string) => {
  const files: string[] = [];
  for await (const file of glob(pattern, { cwd })) {
    files.push(file);
  }
  return files;
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
  storyFiles?: readonly string[];
}) => {
  const resolvedRoot = await realpath(root);
  const input = path.join(resolvedRoot, ".visual-regression", "harness.tsx");
  await mkdir(path.dirname(input), { recursive: true });
  const resolvedStoryFiles = [
    ...new Set(
      storyFiles ??
        (
          await Promise.all(
            storyPatterns.map((pattern) => globFiles(pattern, resolvedRoot))
          )
        ).flat()
    ),
  ].sort();
  const storyModules = resolvedStoryFiles
    .map(
      (file) =>
        `${JSON.stringify(`/${file}`)}: () => import(${JSON.stringify(path.join(resolvedRoot, file))})`
    )
    .join(",\n");
  const source = browserModule
    .replace(
      "__PREVIEW_IMPORT__",
      `import preview from ${JSON.stringify(path.join(resolvedRoot, ".storybook/preview.tsx"))};`
    )
    .replace("__STORY_MODULES__", `{${storyModules}}`);
  await writeFile(input, source);
  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(path.join(outputDirectory, ".visual-regression"), {
    recursive: true,
  });
  await writeFile(
    path.join(outputDirectory, ".visual-regression", "harness.html"),
    html
  );

  const require = createRequire(path.join(resolvedRoot, "package.json"));
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
    conditions: ["webstudio", "browser"],
    define: {
      "import.meta.env": "{}",
      "process.env.NODE_DEBUG": "undefined",
      "process.env.IS_STROYBOOK": "true",
    },
    entryNames: "harness",
    entryPoints: [input],
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
    outdir: outputDirectory,
    platform: "browser",
    plugins: [urlAssetPlugin],
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
      await rm(input, { force: true });
    },
  };
};
