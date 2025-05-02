import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";

export default defineConfig({
  plugins: [cloudflare({ viteEnvironment: { name: "ssr" } }), reactRouter()],
  resolve: {
    conditions: ["browser", "development|production"],
  },
  ssr: {
    resolve: {
      conditions: ["node", "development|production"],
    },
  },
});
