import { expect } from "@playwright/test";
import { openProjectBuilder, waitForCanvasText } from "../flows/builder";
import {
  bindSelectedTextContentToExpression,
  createGraphqlResourceVariable,
  createHttpResourceVariable,
  createStringVariable,
  createSystemResourceVariable,
  selectContentInstance,
  startGraphqlResourceServer,
  startJsonResourceServer,
} from "../flows/data-variables";
import { withGeneratedPreview } from "../flows/generated-app";
import { waitForSyncComplete } from "../flows/sync-status";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import {
  preparePreviewLinksProject,
  previewLinkText,
} from "../fixtures/preview-links-project";
import { test } from "../test";
import { measure } from "../perf";

test("Generated app renders Builder-created variables and navigates linked routes", async ({
  page,
  context,
}) => {
  const http = await startJsonResourceServer({
    title: "Rendered from local HTTP resource",
  });
  const graphql = await startGraphqlResourceServer({
    title: "Rendered from local GraphQL resource",
  });

  try {
    const fixture = await createContentModeProject({
      context,
      email: "generated-resources@webstudio.test",
      title: "Generated resources",
      assetNamePrefix: "generated-resources-",
      editorToken: "generated-resources-editor-token",
      builderToken: "generated-resources-builder-token",
    });
    await preparePreviewLinksProject(fixture.projectId);
    await measure("generated resources open Builder", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
      });
      await waitForCanvasText({ page, text: "Initial content" });
    });
    await selectContentInstance({ page });

    await test.step("create static variable through Builder", async () => {
      await createStringVariable({
        page,
        name: "e2eGeneratedLabel",
        value: "Rendered from local static variable",
      });
    });
    await test.step("create HTTP resource through Builder", async () => {
      await createHttpResourceVariable({
        page,
        name: "e2eGeneratedPosts",
        url: http.url,
      });
    });
    await test.step("create GraphQL resource through Builder", async () => {
      await createGraphqlResourceVariable({
        page,
        name: "e2eGeneratedPost",
        url: graphql.url,
        query: "query Post { post { title } }",
      });
    });
    await test.step("create system resource through Builder", async () => {
      await createSystemResourceVariable({
        page,
        name: "e2eGeneratedCurrentDate",
        resource: "Current date resource",
      });
    });

    const expectedYear = String(new Date().getUTCFullYear());
    const expectedText = `Rendered from local static variable | Rendered from local HTTP resource | Rendered from local GraphQL resource | ${expectedYear}`;
    await bindSelectedTextContentToExpression({
      page,
      expression:
        'e2eGeneratedLabel + " | " + e2eGeneratedPosts.data.title + " | " + e2eGeneratedPost.data.data.post.title + " | " + e2eGeneratedCurrentDate.data.year',
    });
    await waitForCanvasText({ page, text: expectedText });
    await waitForSyncComplete({ page });

    const reloadBuilder = measure(
      "generated resources reload Builder",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.builderToken,
        });
        await waitForCanvasText({ page, text: expectedText });
      }
    );
    const verifyPreview =
      test.step("verify variables and links in the generated Preview", async () => {
        await withGeneratedPreview({
          projectId: fixture.projectId,
          callback: async ({ url, html }) => {
            await test.step("render static, HTTP, GraphQL, and system variables", () => {
              expect(html).toContain(expectedText);
            });
            await test.step("render and navigate the linked route", async () => {
              await reloadBuilder;
              const target = new URL("/my-page", url).href;
              const response = await fetch(target, { redirect: "manual" });
              expect(response.ok).toBe(true);
              expect(await response.text()).toContain(previewLinkText.pageLink);

              await page.goto(url);
              const link = page.getByRole("link", {
                name: previewLinkText.pageLink,
                exact: true,
              });
              await link.click();
              await expect(page).toHaveURL(target);
              await expect(link).toBeVisible();
              await expect(link).toHaveAttribute("aria-current", "page");
            });
          },
        });
      });

    // Both checks use the resource receivers until Preview and Builder finish.
    const results = await Promise.allSettled([reloadBuilder, verifyPreview]);
    for (const result of results) {
      if (result.status === "rejected") {
        throw result.reason;
      }
    }
  } finally {
    await Promise.all([http.close(), graphql.close()]);
  }
});
