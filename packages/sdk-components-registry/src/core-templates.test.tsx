/** Verifies the registry-owned templates that require real components. */
import { expect, test } from "vitest";
import {
  collectionComponent,
  encodeDataVariableId,
  executeExpression,
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

test("Form error message binds all errors through its authored container", () => {
  const fragment = renderCoreTemplate(coreTemplates.form);
  const error = fragment.instances.find(
    ({ label }) => label === "Error message"
  )!;
  const errors = fragment.dataSources?.find(({ name }) => name === "errors")!;
  const collection = fragment.instances.find(
    ({ component }) => component === collectionComponent
  )!;
  const list = fragment.instances.find(({ tag }) => tag === "ul")!;
  expect(error.children).toContainEqual({ type: "id", value: list.id });
  expect(list.children).toContainEqual({ type: "id", value: collection.id });
  const listItem = fragment.instances.find(({ tag }) => tag === "li")!;
  expect(collection.children).toContainEqual({
    type: "id",
    value: listItem.id,
  });
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
  expect(message?.id).toBe(listItem.id);
  expect(error.tag).toBe("div");
  expect(fragment.instances.some(({ tag }) => tag === "ul")).toBe(true);
  expect(fragment.instances.some(({ tag }) => tag === "li")).toBe(true);
  const listStyleSourceId = fragment.styleSourceSelections.find(
    ({ instanceId }) => instanceId === list.id
  )?.values[0];
  expect(
    fragment.styles
      .filter(({ styleSourceId }) => styleSourceId === listStyleSourceId)
      .map(({ property, value }) => ({ property, value }))
  ).toEqual(
    expect.arrayContaining([
      { property: "display", value: { type: "keyword", value: "grid" } },
      { property: "rowGap", value: { type: "unit", unit: "px", value: 4 } },
    ])
  );
  const errorStyleSourceId = fragment.styleSourceSelections.find(
    ({ instanceId }) => instanceId === error.id
  )?.values[0];
  expect(
    fragment.styles
      .filter(({ styleSourceId }) => styleSourceId === errorStyleSourceId)
      .map(({ property, value }) => ({ property, value }))
  ).toEqual(
    expect.arrayContaining([
      {
        property: "backgroundColor",
        value: expect.objectContaining({
          type: "color",
          components: [1, 0.9686, 0.9647],
        }),
      },
    ])
  );
});

test("Form success and error feedback render without DOM markers", () => {
  const fragment = renderCoreTemplate(coreTemplates.form);
  const feedback = fragment.instances.filter(
    ({ label }) => label === "Success message" || label === "Error message"
  );
  expect(feedback).toHaveLength(2);
  expect(JSON.stringify(fragment)).not.toContain("data-ws-form-feedback");
});

test("Form state stays internal while feedback uses the formState variable", () => {
  const fragment = renderCoreTemplate(coreTemplates.form);
  const form = fragment.instances.find(
    ({ component }) => component === "Form"
  )!;
  const formProps = fragment.props.filter(
    ({ instanceId }) => instanceId === form.id
  );

  expect(formProps.some(({ name }) => name === "state")).toBe(false);
  expect(formProps.some(({ name }) => name === "onStateChange")).toBe(true);
  expect(fragment.dataSources?.some(({ name }) => name === "formState")).toBe(
    true
  );
});

test("default Form leaves layout to its Form content", () => {
  const fragment = renderCoreTemplate(coreTemplates.form);
  const form = fragment.instances.find(({ component }) => component === "Form");
  const content = fragment.instances.find(
    ({ label }) => label === "Form content"
  );
  expect(form).toBeDefined();
  expect(content).toBeDefined();
  expect(
    fragment.styleSourceSelections.filter(
      ({ instanceId }) => instanceId === form?.id
    )
  ).toEqual([]);
  const contentStyleSourceId = fragment.styleSourceSelections.find(
    ({ instanceId }) => instanceId === content?.id
  )?.values[0];
  expect(
    fragment.styles
      .filter(({ styleSourceId }) => styleSourceId === contentStyleSourceId)
      .map(({ property, value }) => ({ property, value }))
  ).toEqual([
    { property: "display", value: { type: "keyword", value: "flex" } },
    {
      property: "flexDirection",
      value: { type: "keyword", value: "column" },
    },
    { property: "alignItems", value: { type: "keyword", value: "start" } },
    { property: "rowGap", value: { type: "unit", unit: "px", value: 16 } },
    { property: "columnGap", value: { type: "unit", unit: "px", value: 16 } },
  ]);
});

test("new Form templates select project and visitor Email Resources", () => {
  const fragment = renderCoreTemplate(coreTemplates.form);
  const renderedTemplate = JSON.stringify(fragment);
  const form = fragment.instances.find(
    ({ component }) => component === "Form"
  )!;
  const action = fragment.props.find(
    ({ instanceId, name }) => instanceId === form.id && name === "action"
  );
  const emailSources = fragment.dataSources.filter(
    (source) => source.type === "resource"
  );
  expect(action).toMatchObject({
    type: "json",
    value: emailSources.map(({ id }) => ({ dataSourceId: id })),
  });
  expect(emailSources.map(({ scopeInstanceId }) => scopeInstanceId)).toEqual([
    form.id,
    form.id,
  ]);
  const emailResources = emailSources.map((source) =>
    fragment.resources.find(({ id }) => id === source.resourceId)
  );
  expect(emailResources.map((resource) => resource?.name)).toEqual([
    "Email to owner",
    "Email to visitor",
  ]);
  expect(emailResources.map((resource) => resource?.email)).toEqual([
    expect.objectContaining({
      recipientMode: "project",
      subject: expect.stringContaining("Contact form: "),
      body: expect.not.stringContaining("Submitted fields"),
    }),
    {
      recipientMode: "visitor",
      visitorEmailField: "email",
      subject: expect.stringContaining(".subject"),
      body: JSON.stringify(
        "Thank you for your message.\n\nWe received it and will respond as soon as possible."
      ),
      includeAttachments: false,
      confirmationSubject: "formSubject",
      confirmationBody: "default",
    },
  ]);
  expect(renderedTemplate).not.toMatch(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i);
  for (const resource of emailResources) {
    expect(resource?.email).not.toHaveProperty("recipients");
    expect(resource?.email).not.toHaveProperty("recipientsExpression");
    expect(resource?.email).not.toHaveProperty("sender");
    expect(resource?.email).not.toHaveProperty("senderExpression");
  }
  expect(emailResources[0]?.email?.subject).toContain(".subject");
  expect(emailResources[1]?.email?.subject).toContain(".subject");
  expect(emailResources[0]?.email?.body).toContain(".pageUrl");
  expect(
    emailResources
      .flatMap((resource) => [resource?.email?.subject, resource?.email?.body])
      .some((expression) => expression?.includes("?."))
  ).toBe(false);
  expect(emailResources.every((resource) => resource?.body === undefined)).toBe(
    true
  );
  expect(renderedTemplate).toContain(
    "Thanks for contacting us. Your message has been sent."
  );
  expect(renderedTemplate).toContain(
    "We could not send your message. Please try again."
  );
  expect(renderedTemplate).toContain("Thank you for your message.");
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
    .map(({ id, component }) => {
      const propValue = (name: string) =>
        fragment.props.find(
          (prop) => prop.instanceId === id && prop.name === name
        )?.value;
      return {
        component,
        name: propValue("name"),
        type: propValue("type"),
        required: propValue("required"),
      };
    });
  expect(contactFields).toEqual([
    { component: "Input", name: "name", type: undefined, required: true },
    { component: "Input", name: "email", type: "email", required: true },
    { component: "Input", name: "subject", type: undefined, required: true },
    {
      component: "Textarea",
      name: "message",
      type: undefined,
      required: true,
    },
    {
      component: "Input",
      name: "attachment",
      type: "file",
      required: undefined,
    },
  ]);
});

test("default Form email subjects use submitted subject or a readable fallback", () => {
  const fragment = renderCoreTemplate(coreTemplates.form);
  const formData = fragment.dataSources.find(
    (source) => source.type === "parameter" && source.name === "formData"
  );
  if (formData === undefined) {
    throw new Error("Expected formData parameter");
  }
  const subjects = fragment.resources
    .filter((resource) => resource.control === "email")
    .map((resource) => resource.email?.subject);
  const evaluateSubject = (subject: string | undefined, data: object) => {
    if (subject === undefined) {
      throw new Error("Expected email subject");
    }
    expect(subject).toContain(`${encodeDataVariableId(formData.id)}.subject`);
    expect(subject).not.toContain("?.");
    return executeExpression(
      subject.replaceAll(
        encodeDataVariableId(formData.id),
        JSON.stringify(data)
      )
    );
  };

  expect(subjects).toHaveLength(2);
  expect(
    subjects.map((subject) => evaluateSubject(subject, { subject: "Question" }))
  ).toEqual(["Contact form: Question", "Question"]);
  expect(subjects.map((subject) => evaluateSubject(subject, {}))).toEqual([
    "Contact form: New message",
    "Your message",
  ]);
});
