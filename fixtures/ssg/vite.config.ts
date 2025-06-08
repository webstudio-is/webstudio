import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import vike from "vike/plugin";

export default defineConfig({
  plugins: [react(), vike({ prerender: true })],
  resolve: {
    conditions: ["browser", "development|production"],
  },
  ssr: {
    resolve: {
      conditions: ["node", "development|production"],
    },
  },
});
