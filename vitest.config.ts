import {
  defaultClientConditions,
  defaultServerConditions,
  defineConfig,
} from "vite";

export default defineConfig({
  resolve: {
    conditions: ["webstudio", ...defaultClientConditions],
  },
  ssr: {
    resolve: {
      conditions: ["webstudio", ...defaultServerConditions],
    },
  },
});
