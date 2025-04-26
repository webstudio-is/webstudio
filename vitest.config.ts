import { defaultServerConditions, defineConfig } from "vite";

export default defineConfig({
  // resolve webstudio condition in tests
  ssr: {
    resolve: {
      conditions: ["webstudio", ...defaultServerConditions],
    },
  },
});
