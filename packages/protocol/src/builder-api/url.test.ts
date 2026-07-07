import { expect, test } from "vitest";
import { parseBuilderUrl } from "./url";

test.each([
  [
    "wstd.dev",
    "https://p-090e6e14-ae50-4b2e-bd22-71733cec05bb.wstd.dev",
    "https://wstd.dev",
    "090e6e14-ae50-4b2e-bd22-71733cec05bb",
  ],
  [
    "localhost",
    "https://p-090e6e14-ae50-4b2e-bd22-71733cec05bb.localhost",
    "https://localhost",
    "090e6e14-ae50-4b2e-bd22-71733cec05bb",
  ],
  [
    "invalid localhost",
    "https://p-eee.localhost",
    "https://p-eee.localhost",
    undefined,
  ],
  [
    "development.webstudio.is",
    "https://p-090e6e14-ae50-4b2e-bd22-71733cec05bb.development.webstudio.is",
    "https://development.webstudio.is",
    "090e6e14-ae50-4b2e-bd22-71733cec05bb",
  ],
  [
    "main.development.webstudio.is",
    "https://p-090e6e14-ae50-4b2e-bd22-71733cec05bb-dot-main.development.webstudio.is",
    "https://main.development.webstudio.is",
    "090e6e14-ae50-4b2e-bd22-71733cec05bb",
  ],
  [
    "branch.development.webstudio.is",
    "https://p-090e6e14-ae50-4b2e-bd22-71733cec05bb-dot-branch.development.webstudio.is",
    "https://branch.development.webstudio.is",
    "090e6e14-ae50-4b2e-bd22-71733cec05bb",
  ],
  [
    "apps.webstudio.is",
    "https://p-090e6e14-ae50-4b2e-bd22-71733cec05bb.apps.webstudio.is",
    "https://apps.webstudio.is",
    "090e6e14-ae50-4b2e-bd22-71733cec05bb",
  ],
  [
    "plain apps.webstudio.is",
    "https://apps.webstudio.is",
    "https://apps.webstudio.is",
    undefined,
  ],
] as const)("parseBuilderUrl %s", (_name, url, sourceOrigin, projectId) => {
  expect(parseBuilderUrl(url)).toEqual({ projectId, sourceOrigin });
});
