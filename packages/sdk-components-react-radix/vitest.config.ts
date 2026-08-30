import { defineConfig } from "vitest/config";
import {
  browserTestPorts,
  createBrowserTestConfig,
} from "../../scripts/vitest-browser-workspace";

export default defineConfig(
  createBrowserTestConfig(browserTestPorts.sdkComponentsReactRadix)
);
