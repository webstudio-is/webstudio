import type { Page } from "playwright";
import { openProjectBuilder, waitForCanvasText } from "../flows/builder";
import {
  bindSelectedTextContentToExpression,
  createGraphqlResourceVariable,
  createHttpResourceVariable,
  createSystemResourceVariable,
  selectContentInstance,
} from "../flows/data-variables";
import {
  waitForChangeToBeSaved,
  waitForSyncStatus,
} from "../flows/sync-status";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { loginWithSecret } from "../flows/dashboard";
import { expectGeneratedAppToRender } from "../flows/generated-app";
import { newIsolatedPage, test } from "../harness";
import { measure } from "../perf";
import { loadDevBuild } from "../db";

type DataSourceRecord =
  | {
      id: string;
      type: "variable";
      name: string;
      value: { type: string; value: unknown };
    }
  | {
      id: string;
      type: "resource";
      name: string;
      resourceId: string;
    };

type ResourceRecord = {
  id: string;
  name: string;
  url: string;
  method: string;
  control?: "graphql" | "system";
  body?: string;
  searchParams?: Array<{ name: string; value: string }>;
  headers?: Array<{ name: string; value: string }>;
};

const getDataVariableRuntimeState = async (fixture: { projectId: string }) => {
  const build = await loadDevBuild({ projectId: fixture.projectId });
  return {
    dataSources: JSON.parse(build.dataSources) as DataSourceRecord[],
    resources: JSON.parse(build.resources) as ResourceRecord[],
  };
};

const getVariableForm = (page: Page) =>
  page
    .locator("form")
    .filter({ has: page.locator('input[name="name"]') })
    .last();

const fillVariableName = async ({
  page,
  name,
}: {
  page: Page;
  name: string;
}) => {
  await getVariableForm(page).locator('input[name="name"]').fill(name);
};

const getVariableIdByName = async ({
  fixture,
  name,
}: {
  fixture: { projectId: string };
  name: string;
}) => {
  const { dataSources } = await getDataVariableRuntimeState(fixture);
  const dataSource = dataSources.find((dataSource) => dataSource.name === name);
  if (dataSource === undefined) {
    throw new Error(`Expected data variable "${name}" to exist.`);
  }
  return dataSource.id;
};

const closeVariablePanelAndWaitForSave = async ({ page }: { page: Page }) => {
  const save = waitForChangeToBeSaved({ page });
  await page.getByRole("button", { name: "Close" }).last().click();
  await save;
  await page
    .getByText("New Variable", { exact: true })
    .waitFor({ state: "hidden" });
  await waitForSyncStatus({ page, status: "idle" });
};

const openNewVariablePanel = async ({ page }: { page: Page }) => {
  await page.getByRole("tab", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Add data variable" }).click();
  await page.getByText("New Variable", { exact: true }).waitFor();
};

const createStringVariable = async ({
  page,
  name,
  value,
}: {
  page: Page;
  name: string;
  value: string;
}) => {
  await openNewVariablePanel({ page });
  await fillVariableName({ page, name });
  await page.getByLabel("Value").last().fill(value);
  await closeVariablePanelAndWaitForSave({ page });
};

const editStringVariable = async ({
  page,
  fixture,
  name,
  value,
}: {
  page: Page;
  fixture: { projectId: string };
  name: string;
  value: string;
}) => {
  const id = await getVariableIdByName({ fixture, name });
  await page.locator(`button[data-id="${id}"]`).click();
  await getVariableForm(page).locator('input[name="name"]').waitFor();
  await page.getByLabel("Value").last().fill(value);
  await closeVariablePanelAndWaitForSave({ page });
};

const deleteVariable = async ({
  page,
  fixture,
  name,
}: {
  page: Page;
  fixture: { projectId: string };
  name: string;
}) => {
  const id = await getVariableIdByName({ fixture, name });
  const row = page.locator(`button[data-id="${id}"]`).locator("xpath=..");
  await row.hover();
  await row.getByRole("button", { name: "Open variable menu" }).click();
  await page.getByRole("menuitem", { name: /^Delete/ }).click();
  const save = waitForChangeToBeSaved({ page });
  await page
    .getByRole("dialog", { name: "Delete confirmation" })
    .getByRole("button", { name: "Delete" })
    .click();
  await save;
  await waitForSyncStatus({ page, status: "idle" });
};

const editHttpResourceVariableWithCurl = async ({
  page,
  fixture,
  name,
  curl,
}: {
  page: Page;
  fixture: { projectId: string };
  name: string;
  curl: string;
}) => {
  const id = await getVariableIdByName({ fixture, name });
  await page.locator(`button[data-id="${id}"]`).click();
  await getVariableForm(page).locator('input[name="name"]').waitFor();
  await page.getByRole("textbox", { name: "URL" }).fill(curl);
  await closeVariablePanelAndWaitForSave({ page });
};

const expectVariableListItem = async ({
  page,
  name,
  badge,
}: {
  page: Page;
  name: string;
  badge: "Static variable" | "Dynamic data variable";
}) => {
  const itemButton = page
    .getByText(name, { exact: true })
    .locator("xpath=ancestor::button[@data-id][1]");
  await itemButton.waitFor({ state: "visible" });
  await itemButton
    .locator("xpath=parent::*")
    .getByLabel(badge)
    .waitFor({ state: "attached" });
};

const expectPersistedDataVariables = async ({
  fixture,
  staticName,
  staticValue,
  httpName,
  httpUrl,
  httpCurlUrl,
  httpSearchParamName,
  httpSearchParamValue,
  httpHeaderName,
  httpHeaderValue,
  httpBodyValue,
  graphqlName,
  graphqlUrl,
  graphqlQuery,
  systemName,
  deletedName,
}: {
  fixture: { projectId: string };
  staticName: string;
  staticValue: string;
  httpName: string;
  httpUrl: string;
  httpCurlUrl?: string;
  httpSearchParamName?: string;
  httpSearchParamValue?: string;
  httpHeaderName?: string;
  httpHeaderValue?: string;
  httpBodyValue?: string;
  graphqlName: string;
  graphqlUrl: string;
  graphqlQuery: string;
  systemName: string;
  deletedName?: string;
}) => {
  const { dataSources, resources } = await getDataVariableRuntimeState(fixture);
  const staticVariable = dataSources.find(
    (dataSource) => dataSource.name === staticName
  );
  if (
    staticVariable?.type !== "variable" ||
    staticVariable.value.type !== "string" ||
    staticVariable.value.value !== staticValue
  ) {
    throw new Error(
      `Expected static variable "${staticName}" to persist with string value. Received: ${JSON.stringify(staticVariable)}. All data sources: ${JSON.stringify(dataSources)}`
    );
  }

  const httpVariable = dataSources.find(
    (dataSource) => dataSource.name === httpName
  );
  const httpResource = resources.find(
    (resource) =>
      httpVariable?.type === "resource" &&
      resource.id === httpVariable.resourceId
  );
  if (
    httpVariable?.type !== "resource" ||
    httpResource === undefined ||
    httpResource?.control !== undefined ||
    httpResource.url !== JSON.stringify(httpCurlUrl ?? httpUrl) ||
    httpResource.method !== (httpCurlUrl === undefined ? "get" : "post")
  ) {
    throw new Error(`Expected HTTP resource variable "${httpName}".`);
  }
  if (
    httpSearchParamName !== undefined &&
    httpResource.searchParams?.some(
      (searchParam) =>
        searchParam.name === httpSearchParamName &&
        searchParam.value === JSON.stringify(httpSearchParamValue)
    ) !== true
  ) {
    throw new Error(
      `Expected HTTP resource "${httpName}" to persist search param "${httpSearchParamName}". Received: ${JSON.stringify(httpResource)}`
    );
  }
  if (
    httpHeaderName !== undefined &&
    httpResource.headers?.some(
      (header) =>
        header.name === httpHeaderName &&
        header.value === JSON.stringify(httpHeaderValue)
    ) !== true
  ) {
    throw new Error(
      `Expected HTTP resource "${httpName}" to persist header "${httpHeaderName}". Received: ${JSON.stringify(httpResource)}`
    );
  }
  if (
    httpBodyValue !== undefined &&
    httpResource.body?.includes(httpBodyValue) !== true
  ) {
    throw new Error(
      `Expected HTTP resource "${httpName}" to persist body value "${httpBodyValue}". Received: ${JSON.stringify(httpResource)}`
    );
  }

  if (deletedName !== graphqlName) {
    const graphqlVariable = dataSources.find(
      (dataSource) => dataSource.name === graphqlName
    );
    const graphqlResource = resources.find(
      (resource) =>
        graphqlVariable?.type === "resource" &&
        resource.id === graphqlVariable.resourceId
    );
    if (
      graphqlVariable?.type !== "resource" ||
      graphqlResource?.control !== "graphql" ||
      graphqlResource.url !== JSON.stringify(graphqlUrl) ||
      graphqlResource.method !== "post" ||
      graphqlResource.body?.includes(graphqlQuery) !== true
    ) {
      throw new Error(`Expected GraphQL resource variable "${graphqlName}".`);
    }
  }

  const systemVariable = dataSources.find(
    (dataSource) => dataSource.name === systemName
  );
  const systemResource = resources.find(
    (resource) =>
      systemVariable?.type === "resource" &&
      resource.id === systemVariable.resourceId
  );
  if (
    systemVariable?.type !== "resource" ||
    systemResource?.control !== "system" ||
    systemResource.method !== "get"
  ) {
    throw new Error(`Expected system resource variable "${systemName}".`);
  }

  if (
    deletedName !== undefined &&
    dataSources.some((dataSource) => dataSource.name === deletedName)
  ) {
    throw new Error(`Expected deleted variable "${deletedName}" to be absent.`);
  }
};

test("Builder-created data variables and resources persist after reload", async () => {
  const email = "data-variables-runtime@webstudio.test";
  const fixture = await createContentModeProject({
    email,
    title: "Data Variables Runtime",
    assetNamePrefix: "data-variables-runtime-",
    editorToken: "data-variables-runtime-editor-token",
    builderToken: "data-variables-runtime-builder-token",
  });
  const { page, close } = await newIsolatedPage();
  const staticName = "e2eStaticLabel";
  const staticValue = "Created from Builder UI";
  const editedStaticValue = "Edited from Builder UI";
  const httpName = "e2ePosts";
  const httpUrl = "https://example.com/posts.json";
  const httpCurlUrl = "https://example.com/api/posts";
  const httpSearchParamName = "status";
  const httpSearchParamValue = "published";
  const httpHeaderName = "X-Test";
  const httpHeaderValue = "resource-panel";
  const httpBodyValue = "featured";
  const graphqlName = "e2eGraphqlPosts";
  const graphqlUrl = "https://example.com/graphql";
  const graphqlQuery = "query Posts { posts { id title } }";
  const systemName = "e2eSitemap";

  try {
    await loginWithSecret({ page, email });

    await measure("data variables runtime open builder", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
      });
      await waitForCanvasText({ page, text: "Initial content" });
    });
    await selectContentInstance({ page });

    await measure(
      "data variables runtime create variables through UI",
      async () => {
        await createStringVariable({
          page,
          name: staticName,
          value: staticValue,
        });
        await createHttpResourceVariable({
          page,
          name: httpName,
          url: httpUrl,
        });
        await createGraphqlResourceVariable({
          page,
          name: graphqlName,
          url: graphqlUrl,
          query: graphqlQuery,
        });
        await createSystemResourceVariable({ page, name: systemName });
      }
    );

    await measure(
      "data variables runtime edit resources and variables",
      async () => {
        await editStringVariable({
          page,
          fixture,
          name: staticName,
          value: editedStaticValue,
        });
        await editHttpResourceVariableWithCurl({
          page,
          fixture,
          name: httpName,
          curl: `curl '${httpCurlUrl}?${httpSearchParamName}=${httpSearchParamValue}' --request POST --header '${httpHeaderName}: ${httpHeaderValue}' --header 'Content-Type: application/json' --data '{"${httpBodyValue}":true}'`,
        });
      }
    );

    await expectPersistedDataVariables({
      fixture,
      staticName,
      staticValue: editedStaticValue,
      httpName,
      httpUrl,
      httpCurlUrl,
      httpSearchParamName,
      httpSearchParamValue,
      httpHeaderName,
      httpHeaderValue,
      httpBodyValue,
      graphqlName,
      graphqlUrl,
      graphqlQuery,
      systemName,
      deletedName: undefined,
    });

    await expectVariableListItem({
      page,
      name: staticName,
      badge: "Static variable",
    });
    await expectVariableListItem({
      page,
      name: httpName,
      badge: "Dynamic data variable",
    });
    await expectVariableListItem({
      page,
      name: graphqlName,
      badge: "Dynamic data variable",
    });
    await expectVariableListItem({
      page,
      name: systemName,
      badge: "Dynamic data variable",
    });

    await measure("data variables runtime reload builder", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
      });
    });
    await waitForCanvasText({ page, text: "Initial content" });
    await selectContentInstance({ page });

    await expectVariableListItem({
      page,
      name: staticName,
      badge: "Static variable",
    });
    await expectVariableListItem({
      page,
      name: httpName,
      badge: "Dynamic data variable",
    });
    await expectVariableListItem({
      page,
      name: graphqlName,
      badge: "Dynamic data variable",
    });
    await expectVariableListItem({
      page,
      name: systemName,
      badge: "Dynamic data variable",
    });

    await expectPersistedDataVariables({
      fixture,
      staticName,
      staticValue: editedStaticValue,
      httpName,
      httpUrl,
      httpCurlUrl,
      httpSearchParamName,
      httpSearchParamValue,
      httpHeaderName,
      httpHeaderValue,
      httpBodyValue,
      graphqlName,
      graphqlUrl,
      graphqlQuery,
      systemName,
      deletedName: undefined,
    });

    await measure(
      "data variables runtime delete graphql variable",
      async () => {
        await deleteVariable({
          page,
          fixture,
          name: graphqlName,
        });
      }
    );
    await page.getByText(graphqlName, { exact: true }).waitFor({
      state: "hidden",
    });
    await expectPersistedDataVariables({
      fixture,
      staticName,
      staticValue: editedStaticValue,
      httpName,
      httpUrl,
      httpCurlUrl,
      httpSearchParamName,
      httpSearchParamValue,
      httpHeaderName,
      httpHeaderValue,
      httpBodyValue,
      graphqlName,
      graphqlUrl,
      graphqlQuery,
      systemName,
      deletedName: graphqlName,
    });
  } finally {
    await close();
  }
});

test("Text Content can bind to a Builder-created variable and persist after reload", async () => {
  const email = "text-content-binding@webstudio.test";
  const fixture = await createContentModeProject({
    email,
    title: "Text Content Binding",
    assetNamePrefix: "text-content-binding-",
    editorToken: "text-content-binding-editor-token",
    builderToken: "text-content-binding-builder-token",
  });
  const { page, close } = await newIsolatedPage();
  const staticName = "e2eTextBindingLabel";
  const staticValue = "Bound Text Content";

  try {
    await loginWithSecret({ page, email });

    await measure("text content binding open builder", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
      });
      await waitForCanvasText({ page, text: "Initial content" });
    });
    await selectContentInstance({ page });

    await measure("text content binding create variable", async () => {
      await createStringVariable({
        page,
        name: staticName,
        value: staticValue,
      });
    });

    await measure("text content binding bind expression", async () => {
      await bindSelectedTextContentToExpression({
        page,
        expression: staticName,
      });
      await waitForCanvasText({ page, text: staticValue });
    });

    await measure("text content binding reload builder", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
      });
    });
    await waitForCanvasText({ page, text: staticValue });

    await measure("text content binding generated app renders", async () => {
      await expectGeneratedAppToRender({
        projectId: fixture.projectId,
        expectedText: staticValue,
      });
    });
  } finally {
    await close();
  }
});
