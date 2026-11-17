import { expect } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { test } from "../test";

test("content-mode project setup works without Node-side dashboard requests", async ({
  context,
}) => {
  const request = context.request;
  const get = request.get;
  Object.defineProperty(request, "get", {
    configurable: true,
    value: () => {
      throw new Error("Node-side dashboard request is unavailable");
    },
  });
  try {
    const first = await createContentModeProject({ context });
    const second = await createContentModeProject({ context });
    expect(first.projectId).toBeTruthy();
    expect(second.projectId).not.toBe(first.projectId);
  } finally {
    Object.defineProperty(request, "get", { value: get });
  }
});
