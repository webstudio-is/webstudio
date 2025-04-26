import {
  defaultClientConditions,
  defaultServerConditions,
  defineConfig,
} from "vite";

export default defineConfig({
  // resolve webstudio condition in tests
  resolve: {
    conditions: ["webstudio", ...defaultClientConditions],
  },
  ssr: {
    resolve: {
      conditions: ["webstudio", ...defaultServerConditions],
    },
  },
});
