import { expect } from "@playwright/test";
import { loginAndCreateBlankProject } from "../flows/dashboard";
import { waitForCanvasFrame } from "../flows/builder";
import { getProjectIdFromBuilderUrl, test } from "../test";

test("Dashboard creates a project that opens after reload", async ({
  page,
}) => {
  const projectId = await loginAndCreateBlankProject({
    page,
    email: "dashboard-project-creation@webstudio.test",
    title: "Dashboard project creation",
  });

  await page.reload();
  await waitForCanvasFrame({ page });
  expect(getProjectIdFromBuilderUrl(page.url())).toBe(projectId);
});
