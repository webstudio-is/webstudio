import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import netlifyPlugin from "@netlify/vite-plugin-react-router";

export default defineConfig({
  optimizeDeps: {
    entries: ["app/root.tsx", "app/routes/**/*.{ts,tsx}"],
  },
  plugins: [reactRouter(), netlifyPlugin()],
  resolve: {
    conditions: ["browser", "development|production"],
  },
  ssr: {
    resolve: {
      conditions: ["node", "development|production"],
    },
  },
});
