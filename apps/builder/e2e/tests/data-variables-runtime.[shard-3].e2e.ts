import { openProjectBuilder, waitForCanvasText } from "../flows/builder";
import {
  bindSelectedTextContentToExpression,
  createGraphqlResourceVariable,
  createHttpResourceVariable,
  createSystemResourceVariable,
  selectContentInstance,
  startGraphqlResourceServer,
  startJsonResourceServer,
} from "../flows/data-variables";
import { loginWithSecret } from "../flows/dashboard";
import { expectGeneratedAppToRender } from "../flows/generated-app";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { newIsolatedPage, test } from "../harness";
import { measure } from "../perf";

const openGeneratedResourceProject = async ({
  page,
  email,
  title,
  assetNamePrefix,
}: {
  page: Awaited<ReturnType<typeof newIsolatedPage>>["page"];
  email: string;
  title: string;
  assetNamePrefix: string;
}) => {
  const fixture = await createContentModeProject({
    email,
    title,
    assetNamePrefix,
    editorToken: `${assetNamePrefix}editor-token`,
    builderToken: `${assetNamePrefix}builder-token`,
  });
  await loginWithSecret({ page, email });
  await measure(`${title} open builder`, async () => {
    await openProjectBuilder({
      page,
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
    });
    await waitForCanvasText({ page, text: "Initial content" });
  });
  await selectContentInstance({ page });
  return fixture;
};

const reloadAndSelectContent = async ({
  page,
  fixture,
  phase,
}: {
  page: Awaited<ReturnType<typeof newIsolatedPage>>["page"];
  fixture: { projectId: string; builderToken: string };
  phase: string;
}) => {
  await measure(phase, async () => {
    await openProjectBuilder({
      page,
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
    });
    await waitForCanvasText({ page, text: "Initial content" });
    await selectContentInstance({ page });
  });
};

test("Generated app fetches and renders a Builder-created HTTP resource", async () => {
  const { page, close } = await newIsolatedPage();
  const resource = await startJsonResourceServer({
    title: "Rendered from local HTTP resource",
  });
  const resourceName = "e2eGeneratedPosts";

  try {
    const fixture = await openGeneratedResourceProject({
      page,
      email: "generated-resource@webstudio.test",
      title: "Generated HTTP Resource",
      assetNamePrefix: "generated-resource-",
    });
    await measure("generated HTTP resource create variable", async () => {
      await createHttpResourceVariable({
        page,
        name: resourceName,
        url: resource.url,
      });
    });
    await reloadAndSelectContent({
      page,
      fixture,
      phase: "generated HTTP resource reload Builder",
    });
    await bindSelectedTextContentToExpression({
      page,
      expression: `${resourceName}.data.title`,
    });
    await waitForCanvasText({
      page,
      text: "Rendered from local HTTP resource",
    });
    await expectGeneratedAppToRender({
      projectId: fixture.projectId,
      expectedText: "Rendered from local HTTP resource",
    });
  } finally {
    await resource.close();
    await close();
  }
});

test("Generated app fetches and renders a Builder-created GraphQL resource", async () => {
  const { page, close } = await newIsolatedPage();
  const resource = await startGraphqlResourceServer({
    title: "Rendered from local GraphQL resource",
  });
  const resourceName = "e2eGeneratedPost";

  try {
    const fixture = await openGeneratedResourceProject({
      page,
      email: "generated-graphql-resource@webstudio.test",
      title: "Generated GraphQL Resource",
      assetNamePrefix: "generated-graphql-resource-",
    });
    await createGraphqlResourceVariable({
      page,
      name: resourceName,
      url: resource.url,
      query: "query Post { post { title } }",
    });
    await reloadAndSelectContent({
      page,
      fixture,
      phase: "generated GraphQL resource reload Builder",
    });
    await bindSelectedTextContentToExpression({
      page,
      expression: `${resourceName}.data.data.post.title`,
    });
    await waitForCanvasText({
      page,
      text: "Rendered from local GraphQL resource",
    });
    await expectGeneratedAppToRender({
      projectId: fixture.projectId,
      expectedText: "Rendered from local GraphQL resource",
    });
  } finally {
    await resource.close();
    await close();
  }
});

test("Generated app renders a Builder-created current-date system resource", async () => {
  const { page, close } = await newIsolatedPage();
  const resourceName = "e2eGeneratedCurrentDate";
  const expectedYear = String(new Date().getUTCFullYear());

  try {
    const fixture = await openGeneratedResourceProject({
      page,
      email: "generated-system-resource@webstudio.test",
      title: "Generated System Resource",
      assetNamePrefix: "generated-system-resource-",
    });
    await createSystemResourceVariable({
      page,
      name: resourceName,
      resource: "Current Date",
    });
    await reloadAndSelectContent({
      page,
      fixture,
      phase: "generated system resource reload Builder",
    });
    await bindSelectedTextContentToExpression({
      page,
      expression: `${resourceName}.data.year`,
    });
    await waitForCanvasText({ page, text: expectedYear });
    await expectGeneratedAppToRender({
      projectId: fixture.projectId,
      expectedText: expectedYear,
    });
  } finally {
    await close();
  }
});
