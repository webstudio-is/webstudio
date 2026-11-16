import type { Page } from "@playwright/test";
import {
  createId,
  encodeDataSourceVariable,
  type Instance,
} from "@webstudio-is/sdk";
import { loadDevBuild, updateBuild } from "../db";
import { measure } from "../perf";
import { openProjectBuilder, waitForCanvasText } from "./builder";
import { selectNavigatorItem } from "./navigator";
import { waitForChangeToBeSaved } from "./sync-status";

const seedSavedWebhookForm = async (projectId: string) => {
  const build = await loadDevBuild({ projectId });
  const instances = JSON.parse(build.instances) as Instance[];
  const body = instances.find((instance) => instance.id === "body");
  if (body === undefined) {
    throw new Error("Expected the fixture's body instance");
  }
  const id = () => createId("nano");
  const formId = id();
  const stateId = id();
  const contentId = id();
  const nameLabelId = id();
  const nameInputId = id();
  const emailLabelId = id();
  const emailInputId = id();
  const buttonId = id();
  const successId = id();
  const errorId = id();
  const formState = encodeDataSourceVariable(stateId);
  const nameStyleId = `${nameLabelId}:ws:style`;
  const nameInputStyleId = `${nameInputId}:ws:style`;
  const emailStyleId = `${emailLabelId}:ws:style`;
  const emailInputStyleId = `${emailInputId}:ws:style`;
  const breakpoints = JSON.parse(build.breakpoints) as Array<{
    id: string;
    label?: string;
    minWidth?: number;
    maxWidth?: number;
  }>;
  const baseBreakpoint = breakpoints.find(
    ({ minWidth, maxWidth }) => minWidth === undefined && maxWidth === undefined
  );
  const breakpointId = baseBreakpoint?.id ?? "base";
  if (baseBreakpoint === undefined) {
    breakpoints.push({ id: breakpointId, label: "" });
  }
  const instancesToAdd: Instance[] = [
    {
      type: "instance",
      id: formId,
      component: "WebhookForm",
      children: [contentId, successId, errorId].map((value) => ({
        type: "id",
        value,
      })),
    },
    {
      type: "instance",
      id: contentId,
      component: "ws:element",
      tag: "div",
      label: "Form Content",
      children: [
        nameLabelId,
        nameInputId,
        emailLabelId,
        emailInputId,
        buttonId,
      ].map((value) => ({
        type: "id",
        value,
      })),
    },
    {
      type: "instance",
      id: nameLabelId,
      component: "ws:element",
      tag: "label",
      children: [{ type: "text", value: "Name", placeholder: true }],
    },
    {
      type: "instance",
      id: nameInputId,
      component: "ws:element",
      tag: "input",
      children: [],
    },
    {
      type: "instance",
      id: emailLabelId,
      component: "ws:element",
      tag: "label",
      children: [{ type: "text", value: "Email", placeholder: true }],
    },
    {
      type: "instance",
      id: emailInputId,
      component: "ws:element",
      tag: "input",
      children: [],
    },
    {
      type: "instance",
      id: buttonId,
      component: "ws:element",
      tag: "button",
      children: [{ type: "text", value: "Submit", placeholder: true }],
    },
    {
      type: "instance",
      id: successId,
      component: "ws:element",
      tag: "div",
      label: "Success Message",
      children: [
        {
          type: "text",
          value: "Thank you for getting in touch!",
          placeholder: true,
        },
      ],
    },
    {
      type: "instance",
      id: errorId,
      component: "ws:element",
      tag: "div",
      label: "Error Message",
      children: [
        {
          type: "text",
          value: "Sorry, something went wrong.",
          placeholder: true,
        },
      ],
    },
  ];
  body.children.push({ type: "id", value: formId });
  const makePropId = (instanceId: string, name: string) =>
    `${instanceId}:${name}`;
  const expressionProp = (instanceId: string, name: string, value: string) => ({
    id: makePropId(instanceId, name),
    instanceId,
    name,
    type: "expression" as const,
    value,
    mode: "read" as const,
  });
  const dataSources = JSON.parse(build.dataSources) as unknown[];
  const props = JSON.parse(build.props) as unknown[];
  const styleSources = JSON.parse(build.styleSources) as unknown[];
  const styleSourceSelections = JSON.parse(
    build.styleSourceSelections
  ) as unknown[];
  const styles = JSON.parse(build.styles) as unknown[];

  await updateBuild(build.id, {
    instances: JSON.stringify([...instances, ...instancesToAdd]),
    breakpoints: JSON.stringify(breakpoints),
    dataSources: JSON.stringify([
      ...dataSources,
      {
        type: "variable",
        id: stateId,
        scopeInstanceId: formId,
        name: "formState",
        value: { type: "string", value: "initial" },
      },
    ]),
    props: JSON.stringify([
      ...props,
      expressionProp(formId, "state", formState),
      {
        id: makePropId(formId, "onStateChange"),
        instanceId: formId,
        name: "onStateChange",
        type: "action",
        value: [
          {
            type: "execute",
            args: ["state"],
            code: `${formState} = state`,
          },
        ],
      },
      expressionProp(
        contentId,
        "data-ws-show",
        `${formState} === 'initial' || ${formState} === 'error'`
      ),
      expressionProp(successId, "data-ws-show", `${formState} === 'success'`),
      expressionProp(errorId, "data-ws-show", `${formState} === 'error'`),
      {
        id: makePropId(nameInputId, "name"),
        instanceId: nameInputId,
        name: "name",
        type: "string",
        value: "name",
      },
      {
        id: makePropId(emailInputId, "name"),
        instanceId: emailInputId,
        name: "name",
        type: "string",
        value: "email",
      },
    ]),
    styleSources: JSON.stringify([
      ...styleSources,
      { type: "local", id: nameStyleId },
      { type: "local", id: nameInputStyleId },
      { type: "local", id: emailStyleId },
      { type: "local", id: emailInputStyleId },
    ]),
    styleSourceSelections: JSON.stringify([
      ...styleSourceSelections,
      { instanceId: nameLabelId, values: [nameStyleId] },
      { instanceId: nameInputId, values: [nameInputStyleId] },
      { instanceId: emailLabelId, values: [emailStyleId] },
      { instanceId: emailInputId, values: [emailInputStyleId] },
    ]),
    styles: JSON.stringify([
      ...styles,
      ...[nameStyleId, nameInputStyleId, emailStyleId, emailInputStyleId].map(
        (styleSourceId) => ({
          styleSourceId,
          breakpointId,
          property: "display",
          value: { type: "keyword", value: "block" },
        })
      ),
    ]),
  });
};

const updateResourceActionUrl = async ({
  page,
  url,
}: {
  page: Page;
  url: string;
}) => {
  await page.getByRole("tab", { name: "Settings" }).click();
  await page.getByText("Action", { exact: true }).first().waitFor({
    state: "visible",
    timeout: 10_000,
  });
  const input = page.locator("input:not([placeholder])").last();
  await input.waitFor({ state: "visible", timeout: 10_000 });
  await input.fill(url);
  const save = waitForChangeToBeSaved({ page });
  await input.press("Enter");
  await save;
};

const expectPersistedActionResource = async ({
  projectId,
  url,
}: {
  projectId: string;
  url: string;
}) => {
  const build = await loadDevBuild({ projectId });
  const props = JSON.parse(build.props) as Array<{
    name: string;
    type: string;
    value?: string;
  }>;
  const resources = JSON.parse(build.resources) as Array<{
    id: string;
    name: string;
    method: string;
    url: string;
  }>;
  const dataSources = JSON.parse(build.dataSources) as Array<{
    type: string;
    resourceId?: string;
  }>;
  const resource = resources.find(
    (resource) =>
      resource.name === "action" &&
      resource.method === "post" &&
      resource.url === JSON.stringify(url)
  );
  const actionProp = props.find(
    (prop) =>
      prop.name === "action" &&
      prop.type === "resource" &&
      prop.value === resource?.id
  );

  if (actionProp === undefined || resource === undefined) {
    throw new Error(
      `Expected Webhook Form action prop to persist resource "${url}". Props: ${JSON.stringify(props)} Resources: ${JSON.stringify(resources)}`
    );
  }
  if (
    dataSources.some(
      (dataSource) =>
        dataSource.type === "resource" && dataSource.resourceId === resource.id
    )
  ) {
    throw new Error(
      `Expected Webhook Form action resource "${url}" not to load during rendering. Data sources: ${JSON.stringify(dataSources)}`
    );
  }
};

export const configureSavedWebhookForm = async ({
  page,
  fixture,
}: {
  page: Page;
  fixture: { projectId: string; builderToken: string };
}) => {
  const text = "Initial content";
  const actionUrl = "https://mcp-delivery.example/submit";
  await seedSavedWebhookForm(fixture.projectId);
  await measure("props runtime open builder", async () => {
    await openProjectBuilder({
      page,
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
      features: ["resourceProp"],
    });
  });
  await waitForCanvasText({ page, text });
  await selectNavigatorItem({ page, name: "Webhook Form" });

  await measure("props runtime update resource action", async () => {
    await updateResourceActionUrl({ page, url: actionUrl });
  });
  await expectPersistedActionResource({
    projectId: fixture.projectId,
    url: actionUrl,
  });

  await measure("props runtime reload builder", async () => {
    await openProjectBuilder({
      page,
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
      features: ["resourceProp"],
    });
  });
  await waitForCanvasText({ page, text });
  await expectPersistedActionResource({
    projectId: fixture.projectId,
    url: actionUrl,
  });
};
