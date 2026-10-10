/** Verifies the registry-owned templates that require real components. */
import { expect, test } from "vitest";
import {
  collectionComponent,
  encodeDataVariableId,
  blockComponent,
  blockBodyComponent,
  blockTemplateComponent,
  contentBlockMdxTemplateDescriptors,
  getContentBlockMdxTemplateDescriptor,
  getDefaultContentBlockTemplateName,
} from "@webstudio-is/sdk";
import { renderTemplate, type TemplateMeta } from "@webstudio-is/template";
import { componentIds } from "./components";
import { coreTemplates } from "./core-templates";

const renderCoreTemplate = (template: TemplateMeta | undefined) => {
  if (template === undefined) {
    throw new Error("Expected core template");
  }
  return renderTemplate(template.template, undefined, [], { componentIds });
};

const expectCodeTextDefaultsToStayImplicit = (
  template: TemplateMeta | undefined
) => {
  const fragment = renderCoreTemplate(template);
  const codeText = fragment.instances.find(
    ({ component }) => component === "CodeText"
  );
  expect(codeText?.children).toEqual([
    { type: "text", value: 'const status = "ready";' },
  ]);
  expect(
    fragment.props.filter(({ instanceId }) => instanceId === codeText?.id)
  ).toEqual([]);
};

test("creates unconnected Content Blocks with direct content and no MDX Body wrapper", () => {
  const fragment = renderCoreTemplate(coreTemplates[blockComponent]);
  expect(
    fragment.instances.some(({ component }) => component === blockBodyComponent)
  ).toBe(false);
  const block = fragment.instances.find(
    ({ component }) => component === blockComponent
  )!;
  const children = block.children.map((child) =>
    fragment.instances.find(({ id }) => id === child.value)
  );
  expect(children[0]?.component).toBe(blockTemplateComponent);
  expect(children.slice(1).map((instance) => instance?.tag)).toEqual([
    "p",
    "ul",
  ]);
});

test("keeps Code Text defaults out of standalone and Content Block props", () => {
  expectCodeTextDefaultsToStayImplicit(coreTemplates.code_text);
  expectCodeTextDefaultsToStayImplicit(coreTemplates[blockComponent]);
});

test("keeps the Content Block Image template free of local styles", () => {
  const fragment = renderCoreTemplate(coreTemplates[blockComponent]);
  const image = fragment.instances.find(
    ({ component }) => component === "Image"
  );
  if (image === undefined) {
    throw new Error("Expected Image template");
  }
  expect(
    fragment.styleSourceSelections.filter(
      ({ instanceId }) => instanceId === image.id
    )
  ).toEqual([]);
});

test("gives the Content Block Alert template sample text", () => {
  const fragment = renderCoreTemplate(coreTemplates[blockComponent]);
  const instances = new Map(
    fragment.instances.map((instance) => [instance.id, instance])
  );
  const alert = fragment.instances.find(
    ({ component }) => component === "Alert"
  );
  const paragraphChild = alert?.children[0];
  const paragraph =
    paragraphChild?.type === "id"
      ? instances.get(paragraphChild.value)
      : undefined;

  expect(paragraph?.component).toBe("Paragraph");
  expect(paragraph?.children).toEqual([
    {
      type: "text",
      value: "Add helpful context here.",
      placeholder: true,
    },
  ]);
});

test("generates ordered semantic defaults from their descriptors", () => {
  const fragment = renderCoreTemplate(coreTemplates[blockComponent]);
  const instances = new Map(
    fragment.instances.map((instance) => [instance.id, instance])
  );
  const templates = fragment.instances.find(
    ({ component }) => component === blockTemplateComponent
  );
  if (templates === undefined) {
    throw new Error("Expected Templates container");
  }
  const defaults = templates.children.map((child, index) => {
    if (child.type !== "id") {
      throw new Error("Expected template instance child");
    }
    const instance = instances.get(child.value);
    if (instance === undefined) {
      throw new Error("Expected template instance");
    }
    const descriptor = getContentBlockMdxTemplateDescriptor(instance);
    return descriptor === undefined
      ? {
          type: "custom" as const,
          index,
          component: instance.component,
          label: instance.label,
          name: instance.name,
        }
      : {
          type: "semantic" as const,
          resolutionKey: descriptor.resolutionKey,
          label: instance.label,
          name: instance.name,
        };
  });
  const expectedSemanticDefaults = contentBlockMdxTemplateDescriptors.map(
    (descriptor) => ({
      type: "semantic" as const,
      resolutionKey: descriptor.resolutionKey,
      label: descriptor.label,
      name: getDefaultContentBlockTemplateName(
        descriptor.kind === "element"
          ? { component: "ws:element", tag: descriptor.tag }
          : { component: descriptor.component }
      ),
    })
  );

  expect(defaults.filter(({ type }) => type === "semantic")).toEqual(
    expectedSemanticDefaults
  );
  expect(defaults.filter(({ type }) => type === "custom")).toEqual([
    {
      type: "custom",
      index: contentBlockMdxTemplateDescriptors.findIndex(
        ({ resolutionKey }) => resolutionKey === "component:CodeText"
      ),
      component: "HtmlEmbed",
      label: undefined,
      name: "HtmlEmbed",
    },
  ]);
});

test("Form Error Message binds all errors through its authored container", () => {
  const fragment = renderCoreTemplate(coreTemplates.form);
  const error = fragment.instances.find(
    ({ label }) => label === "Error Message"
  )!;
  const errors = fragment.dataSources?.find(({ name }) => name === "errors")!;
  const collection = fragment.instances.find(
    ({ component }) => component === collectionComponent
  )!;
  expect(error.children).toContainEqual({ type: "id", value: collection.id });
  expect(fragment.props).toContainEqual(
    expect.objectContaining({
      instanceId: collection.id,
      name: "data",
      type: "expression",
      value: encodeDataVariableId(errors.id),
    })
  );
  expect(JSON.stringify(error.children)).not.toContain("could not send");
  const message = fragment.instances.find(({ children }) =>
    children.some(
      (child) => child.type === "expression" && child.value.endsWith(".message")
    )
  );
  expect(message).toBeDefined();
});

test("Form success and error feedback are marked for automatic scrolling", () => {
  const fragment = renderCoreTemplate(coreTemplates.form);
  const feedback = fragment.instances.filter(
    ({ label }) => label === "Success Message" || label === "Error Message"
  );
  expect(feedback).toHaveLength(2);
  expect(
    fragment.props.filter(
      ({ instanceId, name }) =>
        feedback.some(({ id }) => id === instanceId) &&
        name === "data-ws-form-feedback"
    )
  ).toEqual(
    feedback.map(({ id }) =>
      expect.objectContaining({
        instanceId: id,
        name: "data-ws-form-feedback",
      })
    )
  );
});

test("new Form templates select project and visitor Email Resources", () => {
  const fragment = renderCoreTemplate(coreTemplates.form);
  const renderedTemplate = JSON.stringify(fragment);
  const form = fragment.instances.find(
    ({ component }) => component === "NativeForm"
  )!;
  const action = fragment.props.find(
    ({ instanceId, name }) => instanceId === form.id && name === "action"
  );
  const emailSources = fragment.dataSources.filter(
    (source) => source.type === "resource"
  );
  expect(action).toMatchObject({
    type: "json",
    value: emailSources.map(({ id }) => ({ dataSourceId: id, enabled: true })),
  });
  expect(emailSources.map(({ scopeInstanceId }) => scopeInstanceId)).toEqual([
    form.id,
    form.id,
  ]);
  const emailResources = emailSources.map((source) =>
    fragment.resources.find(({ id }) => id === source.resourceId)
  );
  expect(emailResources.map((resource) => resource?.email)).toEqual([
    { recipientMode: "project" },
    {
      recipientMode: "visitor",
      visitorEmailField: "email",
      subject: JSON.stringify("We received your message"),
      body: JSON.stringify(
        "Thanks for contacting us. We received your message and will get back to you soon."
      ),
    },
  ]);
  expect(emailResources.every((resource) => resource?.body === undefined)).toBe(
    true
  );
  expect(renderedTemplate).toContain(
    "Thanks for contacting us. Your message has been sent."
  );
  expect(renderedTemplate).toContain(
    "We could not send your message. Please try again."
  );
  expect(renderedTemplate).toContain(
    "Thanks for contacting us. We received your message and will get back to you soon."
  );
  const emailInput = fragment.instances.find(
    ({ component, id }) =>
      component === "Input" &&
      fragment.props.some(
        (prop) =>
          prop.instanceId === id &&
          prop.name === "type" &&
          prop.value === "email"
      )
  )!;
  expect(fragment.props).toContainEqual(
    expect.objectContaining({
      instanceId: emailInput.id,
      name: "name",
      value: "email",
    })
  );
  const contactFields = fragment.instances
    .filter(
      ({ component }) => component === "Input" || component === "Textarea"
    )
    .map(({ id, component }) => ({
      component,
      name: fragment.props.find(
        (prop) => prop.instanceId === id && prop.name === "name"
      )?.value,
      required: fragment.props.find(
        (prop) => prop.instanceId === id && prop.name === "required"
      )?.value,
    }));
  expect(contactFields).toEqual([
    { component: "Input", name: "name", required: true },
    { component: "Input", name: "email", required: true },
    { component: "Input", name: "subject", required: true },
    { component: "Textarea", name: "message", required: true },
  ]);
});
