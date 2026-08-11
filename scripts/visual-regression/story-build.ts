import { realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  build,
  defaultClientConditions,
  type InlineConfig,
  type Plugin,
} from "vite";
import { hasPrivateStorySources } from "../../.storybook/story-settings";

const visualRoot = path.dirname(fileURLToPath(import.meta.url));
const previewModuleId = "virtual:webstudio-visual-preview";
const storyModulesId = "virtual:webstudio-visual-story-modules";

const createStoryModulesPlugin = ({
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
  const sources = new Map([
    [
      previewModuleId,
      `export { default } from ${JSON.stringify(
        path.join(root, ".storybook/preview.tsx")
      )};`,
    ],
    [storyModulesId, `export const modules = {${modules}};`],
  ]);
  const resolvedPrefix = "\0webstudio-visual:";

  return {
    name: "webstudio-visual-story-modules",
    resolveId(id) {
      if (sources.has(id)) {
        return `${resolvedPrefix}${id}`;
      }
    },
    load(id) {
      if (id.startsWith(resolvedPrefix)) {
        return sources.get(id.slice(resolvedPrefix.length));
      }
    },
  };
};

const createStoryBuildConfig = ({
  root,
  outputDirectory,
  storyFiles,
}: {
  root: string;
  outputDirectory: string;
  storyFiles: readonly string[];
}): InlineConfig => ({
  root: visualRoot,
  configFile: false,
  logLevel: "warn",
  plugins: [
    createStoryModulesPlugin({
      root,
      storyFiles: [...new Set(storyFiles)].sort(),
    }),
  ],
  resolve: {
    alias: { "~": path.join(root, "apps/builder/app") },
    dedupe: ["react", "react-dom"],
    conditions: [
      ...(hasPrivateStorySources(root) ? ["webstudio-private"] : []),
      "webstudio",
      ...defaultClientConditions,
    ],
  },
  define: {
    "process.env.NODE_DEBUG": "undefined",
    "process.env.IS_STROYBOOK": "true",
  },
  build: {
    outDir: outputDirectory,
    emptyOutDir: true,
    target: "es2022",
    reportCompressedSize: false,
    chunkSizeWarningLimit: 5_000,
    rollupOptions: {
      treeshake: false,
      input: path.join(visualRoot, "index.html"),
      onwarn(warning, warn) {
        if (warning.code !== "MODULE_LEVEL_DIRECTIVE") {
          warn(warning);
        }
      },
      output: {
        assetFileNames: "assets/[name]-[hash][extname]",
        chunkFileNames: "chunks/[name]-[hash].js",
        entryFileNames: "harness-[hash].js",
      },
    },
  },
});

export const buildVisualStoryApp = async ({
  root,
  outputDirectory,
  storyFiles,
}: {
  root: string;
  outputDirectory: string;
  storyFiles: readonly string[];
}) => {
  const nodeEnvironment = process.env.NODE_ENV;
  try {
    const resolvedRoot = await realpath(root);
    await build(
      createStoryBuildConfig({
        root: resolvedRoot,
        outputDirectory,
        storyFiles,
      })
    );
  } finally {
    if (nodeEnvironment === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = nodeEnvironment;
    }
  }
};
