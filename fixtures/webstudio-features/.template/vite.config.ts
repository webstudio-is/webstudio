import { defineConfig } from "vite";
// @ts-ignore
import { reactRouter } from "@react-router/dev/vite";
// @ts-ignore
import { dedupeMeta } from "./proxy-emulator/dedupe-meta";

export default defineConfig({
  plugins: [reactRouter(), dedupeMeta],
});
