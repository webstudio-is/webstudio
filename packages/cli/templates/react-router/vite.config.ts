import { defineConfig } from "vite";
import { reactRouter } from "@react-router/dev/vite";

const sourceConditions =
  process.env.WEBSTUDIO_LOCAL_CLI_BOOTSTRAPPED === "1" ? ["webstudio"] : [];

export default defineConfig({
  plugins: [reactRouter()],
  server: {
    hmr: process.env.WEBSTUDIO_PREVIEW_HMR === "disabled" ? false : undefined,
  },
  resolve: {
    conditions: [...sourceConditions, "browser", "development|production"],
  },
  ssr: {
    resolve: {
      conditions: [...sourceConditions, "node", "development|production"],
    },
  },
});
