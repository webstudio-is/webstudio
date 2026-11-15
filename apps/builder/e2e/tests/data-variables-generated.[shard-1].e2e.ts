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
import { loginWithSecret } from "../flows/dashboard";
import { withGeneratedPreview } from "../flows/generated-app";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { test } from "../test";
import { measure } from "../perf";

test("Generated app renders Builder-created static, HTTP, GraphQL, and system variables", async ({
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
    await loginWithSecret({
      page,
      email: "generated-resources@webstudio.test",
    });
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

    await measure("generated resources reload Builder", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
      });
      await waitForCanvasText({ page, text: "Initial content" });
      await selectContentInstance({ page });
    });
    const expectedYear = String(new Date().getUTCFullYear());
    const expectedText = `Rendered from local static variable | Rendered from local HTTP resource | Rendered from local GraphQL resource | ${expectedYear}`;
    await bindSelectedTextContentToExpression({
      page,
      expression:
        'e2eGeneratedLabel + " | " + e2eGeneratedPosts.data.title + " | " + e2eGeneratedPost.data.data.post.title + " | " + e2eGeneratedCurrentDate.data.year',
    });
    await waitForCanvasText({
      page,
      text: expectedText,
    });

    await test.step("render all three resources in one generated Preview", async () => {
      await withGeneratedPreview({
        projectId: fixture.projectId,
        callback: async ({ html }) => {
          expect(html).toContain(expectedText);
        },
      });
    });
  } finally {
    await Promise.all([http.close(), graphql.close()]);
  }
});
