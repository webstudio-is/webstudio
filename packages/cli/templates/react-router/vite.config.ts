import { existsSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, searchForWorkspaceRoot } from "vite";
import { reactRouter } from "@react-router/dev/vite";

const sourceConditions =
  process.env.WEBSTUDIO_LOCAL_CLI_BOOTSTRAPPED === "1" ? ["webstudio"] : [];
const templateDirectory = fileURLToPath(new URL(".", import.meta.url));
const templateNodeModules = new URL("./node_modules", import.meta.url);

export default defineConfig({
  // Local previews share node_modules, but must not share optimizer state.
  cacheDir: ".react-router/vite",
  // Scan generated routes before first navigation to avoid replacing React
  // dependencies while the browser hydrates an initial page.
  optimizeDeps: {
    entries: ["app/root.tsx", "app/routes/**/*.{ts,tsx}"],
  },
  plugins: [reactRouter()],
  server: {
    hmr: process.env.WEBSTUDIO_PREVIEW_HMR === "disabled" ? false : undefined,
    // The local CLI links node_modules from its source workspace. Vite must
    // serve React Router's client entry from that workspace to hydrate Preview.
    fs: {
      allow: [
        templateDirectory,
        ...(existsSync(templateNodeModules)
          ? [searchForWorkspaceRoot(realpathSync(templateNodeModules))]
          : []),
      ],
    },
  },
  resolve: {
    conditions: [
      ...sourceConditions,
      "import",
      "browser",
      "development|production",
    ],
  },
  ssr: {
    noExternal: ["nanoid"],
    resolve: {
      conditions: [
        ...sourceConditions,
        "import",
        "node",
        "development|production",
      ],
    },
  },
});
