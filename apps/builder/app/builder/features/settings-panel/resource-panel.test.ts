import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { page, userEvent } from "@vitest/browser/context";
import { afterEach, expect, test, vi } from "vitest";
import {
  encodeDataVariableId,
  ROOT_INSTANCE_ID,
  resolveEmailResourceSettings,
  type DataSources,
  type Resource,
} from "@webstudio-is/sdk";
import { computeExpression } from "@webstudio-is/project-build/runtime";
import { FloatingPanel, TooltipProvider } from "@webstudio-is/design-system";
import { $builderMode } from "~/shared/nano-states";
import {
  $dataSources,
  $instances,
  $projectSettings,
  $props,
  $resources,
} from "~/shared/sync/data-stores";
import {
  getResourceScopeForInstance,
  EmailResourceForm,
  Headers,
  ResourceForm,
  UrlField,
} from "./resource-panel";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
const initialResources = $resources.get();
const initialDataSources = $dataSources.get();
const initialProjectSettings = $projectSettings.get();
const initialInstances = $instances.get();
const initialProps = $props.get();
afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  $resources.set(initialResources);
  $dataSources.set(initialDataSources);
  $projectSettings.set(initialProjectSettings);
  $instances.set(initialInstances);
  $props.set(initialProps);
  $builderMode.set("design");
  document.body.innerHTML = "";
});

test("Email Resource Sender has no redundant project-default reset button", async () => {
  $projectSettings.set({
    meta: { emailSender: "Project <project@example.com>" },
    compiler: {},
  });
  $resources.set(
    new Map([
      [
        "email",
        {
          id: "email",
          name: "Notify",
          control: "email",
          method: "post",
          url: '""',
          headers: [],
          email: { sender: "Custom <custom@example.com>" },
        },
      ],
    ])
  );
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(
      createElement(
        TooltipProvider,
        undefined,
        createElement(EmailResourceForm, {
          variable: {
            id: "data-source",
            type: "resource",
            name: "Notify",
            scopeInstanceId: "body",
            resourceId: "email",
          },
        })
      )
    );
  });
  expect(container.querySelector("textarea")?.value).toBe(
    "Custom <custom@example.com>"
  );
  expect(container.textContent).not.toContain("Reset to project default");
  expect(
    JSON.parse(
      container.querySelector<HTMLInputElement>('input[name="email-settings"]')
        ?.value ?? "{}"
    ).sender
  ).toBe("Custom <custom@example.com>");
});

test("Email Resource uses Subject and Body inputs with a separate binding editor", async () => {
  $builderMode.set("design");
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(
      createElement(
        TooltipProvider,
        undefined,
        createElement(EmailResourceForm, {
          variable: {
            id: "data-source",
            type: "resource",
            name: "Notify",
            scopeInstanceId: "body",
            resourceId: "email",
          },
        })
      )
    );
  });

  expect(
    Array.from(container.querySelectorAll("label")).map(
      (label) => label.textContent
    )
  ).toContain("Subject");
  expect(
    Array.from(container.querySelectorAll("label")).map(
      (label) => label.textContent
    )
  ).toContain("Body");
  expect(container.textContent).not.toContain("expression");
  expect(
    container.querySelector('input[placeholder="New form submission"]')
  ).not.toBeNull();

  const subjectBinding = container.querySelector<HTMLButtonElement>(
    'button[data-variant="default"]'
  );
  expect(subjectBinding).not.toBeNull();
  await act(async () => await userEvent.click(subjectBinding!));
  expect(document.body.textContent).toContain("Expression editor");
});

test("Email Resource recipient modes and attachment radios", async () => {
  $resources.set(
    new Map([
      [
        "email",
        {
          id: "email",
          name: "Notify",
          control: "email",
          method: "post",
          url: '""',
          headers: [],
        },
      ],
    ])
  );
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(
      createElement(
        TooltipProvider,
        undefined,
        createElement(EmailResourceForm, {
          variable: {
            id: "data-source",
            type: "resource",
            name: "Notify",
            scopeInstanceId: "body",
            resourceId: "email",
          },
        })
      )
    );
  });

  expect(container.textContent).not.toContain(
    "Emails are sent through Webstudio. Replies go to this address."
  );
  const recipientSelect =
    container.querySelector<HTMLButtonElement>('[role="combobox"]')!;
  await act(async () => await userEvent.click(recipientSelect));
  const customOption = Array.from(
    document.querySelectorAll<HTMLElement>('[role="option"]')
  ).find((option) => option.textContent === "Custom recipients")!;
  await act(async () => await userEvent.click(customOption));
  expect(
    container.querySelector(
      'textarea[placeholder="Acme <acme@example.com>, team@example.com"]'
    )
  ).not.toBeNull();

  const attachmentOptions = container.querySelectorAll('[role="radio"]');
  expect(attachmentOptions).toHaveLength(2);
  await expect(
    page.getByRole("radiogroup", { name: "Attachments" })
  ).toBeVisible();
  expect(container.textContent).toContain("Attach submitted files");
  expect(container.textContent).toContain("Do not attach files");
  await act(
    async () => await userEvent.click(attachmentOptions[1] as HTMLElement)
  );
  expect(
    JSON.parse(
      container.querySelector<HTMLInputElement>('input[name="email-settings"]')
        ?.value ?? "{}"
    ).includeAttachments
  ).toBe(false);
});

test("external Email Resource marks an unavailable Form binding as invalid", async () => {
  $dataSources.set(
    new Map([
      [
        "form-data",
        {
          id: "form-data",
          type: "parameter",
          name: "formData",
          scopeInstanceId: "form",
        },
      ],
    ])
  );
  $resources.set(
    new Map([
      [
        "email",
        {
          id: "email",
          name: "External email",
          control: "email",
          method: "post",
          url: '""',
          headers: [],
          email: {
            body: `\`Private: \${${encodeDataVariableId("form-data")}}\``,
          },
        },
      ],
    ])
  );
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(
      createElement(
        TooltipProvider,
        undefined,
        createElement(EmailResourceForm, {
          variable: {
            id: "external",
            type: "resource",
            name: "External email",
            scopeInstanceId: "body",
            resourceId: "email",
          },
        })
      )
    );
  });
  const body = container.querySelectorAll("textarea")[1]!;
  await act(async () => await userEvent.hover(body));
  expect(document.body.textContent).toContain(
    "This Form binding is unavailable outside its Form."
  );
});

test("visitor Email Resource selects a named Form email field", async () => {
  $instances.set(
    new Map([
      [
        "form",
        {
          type: "instance",
          id: "form",
          component: "NativeForm",
          children: [{ type: "id", value: "email-input" }],
        },
      ],
      [
        "email-input",
        {
          type: "instance",
          id: "email-input",
          component: "Input",
          children: [],
        },
      ],
    ])
  );
  $props.set(
    new Map([
      [
        "name",
        {
          id: "name",
          instanceId: "email-input",
          name: "name",
          type: "string",
          value: "visitorEmail",
        },
      ],
      [
        "type",
        {
          id: "type",
          instanceId: "email-input",
          name: "type",
          type: "string",
          value: "email",
        },
      ],
    ])
  );
  $resources.set(
    new Map([
      [
        "email",
        {
          id: "email",
          name: "Receipt",
          control: "email",
          method: "post",
          url: '""',
          headers: [],
          email: {
            recipientMode: "visitor",
            visitorEmailField: "visitorEmail",
          },
        },
      ],
    ])
  );
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() =>
    root?.render(
      createElement(
        TooltipProvider,
        undefined,
        createElement(EmailResourceForm, {
          variable: {
            id: "resource",
            type: "resource",
            name: "Receipt",
            scopeInstanceId: "form",
            resourceId: "email",
          },
        })
      )
    )
  );
  expect(container.textContent).toContain("Visitor email field");
  expect(container.textContent).toContain("visitorEmail");
  expect(container.textContent).not.toContain("Attachments");
  await act(async () =>
    userEvent.click(container.querySelector('[role="combobox"]')!)
  );
  await act(async () =>
    page
      .getByRole("option", {
        name: "Project recipients (or owner)",
        exact: true,
      })
      .click()
  );
  expect(container.textContent).toContain("Attach submitted files");
  await act(async () =>
    userEvent.click(container.querySelector('[role="combobox"]')!)
  );
  await act(async () =>
    page
      .getByRole("option", { name: "Visitor email field", exact: true })
      .click()
  );
  expect(container.textContent).not.toContain("Attachments");
  expect(container.textContent).not.toContain(
    "A fixed receipt with the site URL is added before the body."
  );
  expect(container.textContent).not.toContain(
    "Select one named email input in this Form."
  );
});

test("includes resource documents when building another resource expression", () => {
  const dataSources: DataSources = new Map([
    [
      "resourceDataSource",
      {
        type: "resource",
        id: "resourceDataSource",
        name: "Author",
        resourceId: "authorResource",
      },
    ],
  ]);
  const document = { data: { id: 1 } };
  const { scope, variableValues } = getResourceScopeForInstance({
    page: undefined,
    instanceKey: "body",
    dataSources,
    variableValuesByInstanceSelector: new Map([
      ["body", new Map([["resourceDataSource", document]])],
    ]),
    includeResourceDataSources: true,
  });

  expect(scope[encodeDataVariableId("resourceDataSource")]).toBe(document);
  expect(variableValues.get("resourceDataSource")).toBe(document);
});

test("notifies the preview when a resource field changes", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const onChange = vi.fn();
  act(() => {
    root?.render(
      createElement(
        TooltipProvider,
        undefined,
        createElement(ResourceForm, { onChange })
      )
    );
  });

  const addSearchParam = container.querySelector<HTMLButtonElement>(
    '[aria-label="Add another search param"]'
  );
  expect(addSearchParam).not.toBeNull();
  act(() => addSearchParam?.click());
  expect(onChange).toHaveBeenCalledOnce();
});

test("body controls follow the effective method for standalone GET and Form Actions", async () => {
  const resource: Resource = {
    id: "request",
    name: "Request",
    method: "get",
    url: '"https://example.com"',
    headers: [],
  };
  $resources.set(new Map([[resource.id, resource]]));
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const variable = {
    type: "resource" as const,
    id: "request-variable",
    name: "Request",
    resourceId: resource.id,
  };
  act(() => {
    root?.render(
      createElement(
        TooltipProvider,
        undefined,
        createElement(ResourceForm, { variable })
      )
    );
  });
  expect(container.textContent).not.toContain("Form submissions use POST");
  expect(container.querySelector('[name="body-format"]')).toBeNull();
  expect(container.querySelector('textarea[name="body"]')).toBeNull();
  act(() => {
    $instances.set(
      new Map([
        [
          "form",
          {
            type: "instance",
            id: "form",
            component: "NativeForm",
            children: [],
          },
        ],
      ])
    );
    $props.set(
      new Map([
        [
          "action",
          {
            id: "action",
            instanceId: "form",
            name: "action",
            type: "json",
            value: [{ dataSourceId: variable.id, enabled: true }],
          },
        ],
      ])
    );
  });
  expect(container.textContent).not.toContain("Form submissions use POST");
  await act(async () =>
    userEvent.click(container.querySelector('button[role="combobox"]')!)
  );
  expect(document.body.textContent).toContain(
    "Form submissions use POST. This method applies elsewhere."
  );
  await act(async () => userEvent.keyboard("{Escape}"));
  expect(container.textContent).toContain("Request body format");
  expect(container.querySelector('[name="body-format"]')).not.toBeNull();
  expect(container.querySelector('textarea[name="body"]')).not.toBeNull();
  expect(resource.method).toBe("get");
});

test("invalidates the preview as soon as a body edit starts", () => {
  const resource: Resource = {
    id: "request",
    name: "Request",
    method: "post",
    url: '"https://example.com"',
    headers: [{ name: "Content-Type", value: '"text/plain"' }],
    body: '"original"',
  };
  $resources.set(new Map([[resource.id, resource]]));
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const onChange = vi.fn();
  act(() => {
    root?.render(
      createElement(
        TooltipProvider,
        undefined,
        createElement(ResourceForm, {
          variable: {
            type: "resource",
            id: "request-variable",
            name: "Request",
            resourceId: resource.id,
          },
          onChange,
        })
      )
    );
  });

  expect(container.textContent).toContain("Request body format");
  expect(container.textContent).not.toContain("Body content type");
  expect(
    Array.from(
      container.querySelectorAll("label"),
      (label) => label.textContent
    )
  ).toContain("Body");

  const body = container.querySelector<HTMLTextAreaElement>(
    "textarea:not([name])"
  );
  expect(body).not.toBeNull();
  act(() => {
    const setValue = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value"
    )?.set;
    setValue?.call(body, "changed");
    body?.dispatchEvent(new Event("input", { bubbles: true }));
    expect(onChange).toHaveBeenCalledOnce();
  });
});

test("shows and submits the selected HTTP body format", async () => {
  const resource: Resource = {
    id: "upload",
    name: "Upload",
    method: "post",
    url: '"https://example.com/upload"',
    headers: [],
    bodyFormat: "multipart",
  };
  $resources.set(new Map([[resource.id, resource]]));
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(
      createElement(
        TooltipProvider,
        undefined,
        createElement(ResourceForm, {
          variable: {
            type: "resource",
            id: "upload-variable",
            name: "Upload",
            resourceId: resource.id,
          },
        })
      )
    );
  });
  expect(
    container.querySelector<HTMLInputElement>('input[name="body-format"]')
      ?.value
  ).toBe("multipart");
  expect(
    container.querySelector<HTMLInputElement>(
      'input[name="header-name"][value="Content-Type"]'
    )
  ).toBeNull();
  expect(container.textContent).toContain("Request body format");
  const explanation =
    "Applies to request bodies. Auto sends JSON or multipart when files are present.";
  expect(container.textContent).not.toContain(explanation);
  await act(async () =>
    userEvent.hover(
      container.querySelector('[aria-label="About request body format"]')!
    )
  );
  await expect
    .poll(() => document.querySelector('[role="tooltip"]')?.textContent)
    .toContain(explanation);
  expect(
    page
      .getByRole("combobox", { name: "Request body format", exact: true })
      .element().textContent
  ).toContain("multipart/form-data");
  await act(async () =>
    page
      .getByRole("combobox", { name: "Request body format", exact: true })
      .click()
  );
  expect(
    Array.from(
      document.querySelectorAll('[role="option"]'),
      (option) => option.textContent
    )
  ).toEqual(["Auto", "application/json", "multipart/form-data"]);
  await act(async () =>
    page.getByRole("option", { name: "application/json", exact: true }).click()
  );
  expect(
    container.querySelector<HTMLInputElement>('input[name="body-format"]')
      ?.value
  ).toBe("json");
  expect(
    container.querySelector<HTMLInputElement>(
      'input[name="header-name"][value="Content-Type"]'
    )
  ).toBeNull();
});

test("marks a text body invalid when JSON format is selected", async () => {
  const resource: Resource = {
    id: "request",
    name: "Request",
    method: "post",
    url: '"https://example.com"',
    headers: [{ name: "Content-Type", value: '"text/plain"' }],
    bodyFormat: "json",
    body: '"plain text"',
  };
  $resources.set(new Map([[resource.id, resource]]));
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(
      createElement(
        TooltipProvider,
        undefined,
        createElement(ResourceForm, {
          variable: {
            type: "resource",
            id: "request-variable",
            name: "Request",
            resourceId: resource.id,
          },
        })
      )
    );
  });
  await vi.waitFor(() =>
    expect(
      container.querySelector<HTMLTextAreaElement>('textarea[name="body"]')
        ?.validationMessage
    ).toBe("Expected valid JSON object in body")
  );
});

test("focuses the resource URL when requested", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(
      createElement(
        TooltipProvider,
        undefined,
        createElement(FloatingPanel, {
          title: "Edit resource",
          open: true,
          children: createElement("button", undefined, "Edit resource"),
          content: createElement(
            "div",
            undefined,
            createElement(UrlField, {
              autoFocus: true,
              aliases: new Map(),
              scope: {},
              value: '"https://example.com"',
              onChange: vi.fn(),
              onCurlPaste: vi.fn(),
            }),
            createElement(Headers, {
              aliases: new Map(),
              scope: {},
              headers: [{ name: "", value: '""' }],
              onChange: vi.fn(),
              suggestHeaders: true,
            })
          ),
        })
      )
    );
  });
  expect(document.activeElement).toBe(
    document.querySelector('textarea[name="url-validator"]')
  );
});

test("selecting a header suggestion with Enter does not submit the resource", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const onSubmit = vi.fn();
  const onChange = vi.fn();
  await act(async () => {
    root?.render(
      createElement(
        TooltipProvider,
        undefined,
        createElement(FloatingPanel, {
          title: "Edit resource",
          open: true,
          children: createElement("button", undefined, "Edit resource"),
          content: createElement(
            "form",
            {
              onSubmit: (event) => {
                event.preventDefault();
                onSubmit();
              },
            },
            createElement("button", { hidden: true }),
            createElement(Headers, {
              aliases: new Map(),
              scope: {},
              headers: [{ name: "", value: '""' }],
              onChange,
              suggestHeaders: true,
            })
          ),
        })
      )
    );
  });

  await act(async () => page.getByPlaceholder("Name").fill("Auth"));
  await act(async () => userEvent.keyboard("{ArrowDown}{Enter}"));
  expect(onChange).toHaveBeenCalledWith([
    { name: "Authorization", value: '""' },
  ]);
  expect(onSubmit).not.toHaveBeenCalled();
});

test("suggests request header names and known values", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const onChange = vi.fn();
  const onOpenChange = vi.fn();
  await act(async () => {
    root?.render(
      createElement(
        TooltipProvider,
        undefined,
        createElement(FloatingPanel, {
          title: "Edit resource",
          open: true,
          onOpenChange,
          children: createElement("button", undefined, "Edit resource"),
          content: createElement(Headers, {
            aliases: new Map(),
            scope: {},
            headers: [{ name: "Content-Type", value: '"application/json"' }],
            onChange,
            suggestHeaders: true,
          }),
        })
      )
    );
  });
  await act(async () => page.getByPlaceholder("Value").fill("text"));
  expect(
    Array.from(document.querySelectorAll('[role="option"]')).map(
      (option) => option.textContent
    )
  ).toContain("text/plain");
  await act(async () =>
    page.getByRole("option", { name: "text/plain", exact: true }).click()
  );
  expect(onChange).toHaveBeenCalledWith([
    { name: "Content-Type", value: '"text/plain"' },
  ]);
  expect(onOpenChange).not.toHaveBeenCalledWith(false);
  expect(page.getByRole("dialog")).toBeVisible();

  await act(async () => page.getByPlaceholder("Name").fill("Auth"));
  expect(
    Array.from(document.querySelectorAll('[role="option"]')).map(
      (option) => option.textContent
    )
  ).toContain("Authorization");

  await act(async () => page.getByPlaceholder("Name").fill("X-Custom"));
  expect(onChange).toHaveBeenCalledWith([
    { name: "X-Custom", value: '"application/json"' },
  ]);
});

test("only Form-scoped Resources can bind submission values", async () => {
  const dataSources: DataSources = new Map([
    [
      "formDataId",
      {
        type: "parameter",
        id: "formDataId",
        name: "formData",
        scopeInstanceId: "form",
      },
    ],
    [
      "browserInfoId",
      {
        type: "parameter",
        id: "browserInfoId",
        name: "browserInfo",
        scopeInstanceId: "form",
      },
    ],
  ]);
  const input = {
    page: undefined,
    instanceKey: "form",
    dataSources,
    variableValuesByInstanceSelector: new Map<string, Map<string, unknown>>([
      ["form", new Map([["formDataId", undefined]])],
    ]),
    liveFormValues: new Map([
      ["form,collection[one],root", { email: "typed@example.com" }],
    ]),
  };
  const internal = getResourceScopeForInstance({
    ...input,
    formScopeInstanceId: "form",
    formScopeSelector: ["form", "collection[one]", "root", ROOT_INSTANCE_ID],
  });
  expect(internal.aliases.get(encodeDataVariableId("formDataId"))).toBe(
    "formData"
  );
  expect(internal.scope[encodeDataVariableId("formDataId")]).toEqual({
    email: "typed@example.com",
  });
  expect(internal.aliases.get(encodeDataVariableId("browserInfoId"))).toBe(
    "browserInfo"
  );
  expect(
    await computeExpression(
      `${encodeDataVariableId("formDataId")}.email`,
      new Map([["formDataId", { email: "person@example.com" }]])
    )
  ).toBe("person@example.com");
  const external = getResourceScopeForInstance(input);
  expect(external.scope[encodeDataVariableId("formDataId")]).toBeUndefined();
  expect(external.scope[encodeDataVariableId("browserInfoId")]).toBeUndefined();
});

test("Resource editor explains caching and add buttons in tooltips and removes pair rows", async () => {
  const resource: Resource = {
    id: "request",
    name: "Request",
    method: "post",
    url: '"https://example.com"',
    headers: [{ name: "X-Test", value: '"value"' }],
    searchParams: [{ name: "q", value: '"term"' }],
  };
  $resources.set(new Map([[resource.id, resource]]));
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      createElement(TooltipProvider, {
        delayDuration: 0,
        children: createElement(ResourceForm, {
          variable: {
            type: "resource",
            id: "request-variable",
            name: "Request",
            resourceId: resource.id,
          },
        }),
      })
    )
  );
  for (const [selector, explanation] of [
    [
      '[aria-label="About Cache max age"]',
      "How long to cache the response, in seconds.",
    ],
    ['[aria-label="Add another header"]', "Add a request header."],
    ['[aria-label="Add another search param"]', "Add a URL search parameter."],
  ]) {
    expect(container.textContent).not.toContain(explanation);
    await act(async () => userEvent.hover(container.querySelector(selector)!));
    await expect
      .poll(() =>
        Array.from(
          document.querySelectorAll('[role="tooltip"]'),
          (tooltip) => tooltip.textContent
        ).join(" ")
      )
      .toContain(explanation);
    await act(async () =>
      userEvent.unhover(container.querySelector(selector)!)
    );
    await expect
      .poll(() => document.querySelector('[role="tooltip"]'))
      .toBeNull();
  }
  expect(
    container.querySelector('input[name="header-name"][value="X-Test"]')
  ).not.toBeNull();
  await act(async () =>
    userEvent.click(container.querySelector('[aria-label="Delete header"]')!)
  );
  expect(
    container.querySelector('input[name="header-name"][value="X-Test"]')
  ).toBeNull();
  expect(
    container.querySelector('input[name="search-param-name"][value="q"]')
  ).not.toBeNull();
  await act(async () =>
    userEvent.click(
      container.querySelector('[aria-label="Delete search param"]')!
    )
  );
  expect(
    container.querySelector('input[name="search-param-name"][value="q"]')
  ).toBeNull();
});

test.each([
  [JSON.stringify('{"a":1}'), "text/plain", false],
  [JSON.stringify('{"a":1}'), "text/plain", false],
  ["{ a: 1 }", "application/json", true],
  ["[1, 2]", "application/json", true],
  ["42", "application/json", true],
  ["true", "application/json", true],
] as const)(
  "infers Auto body content type and editor from %s",
  async (body, mime, jsonEditor) => {
    $resources.set(
      new Map([
        [
          "request",
          {
            id: "request",
            name: "Request",
            method: "post",
            url: '"https://example.com"',
            headers: [],
            body,
          },
        ],
      ])
    );
    const container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () =>
      root?.render(
        createElement(
          TooltipProvider,
          undefined,
          createElement(ResourceForm, {
            variable: {
              type: "resource",
              id: "request-variable",
              name: "Request",
              resourceId: "request",
            },
          })
        )
      )
    );
    expect(container.textContent).not.toContain("Body content type");
    const header = container.querySelector<HTMLInputElement>(
      'input[name="header-name"][value="Content-Type"]'
    );
    await expect
      .poll(() => (header?.nextElementSibling as HTMLInputElement)?.value)
      .toBe(JSON.stringify(mime));
    expect(container.querySelector(".cm-editor") !== null).toBe(jsonEditor);
    await expect
      .poll(
        () =>
          container.querySelector<HTMLTextAreaElement>('textarea[name="body"]')
            ?.validationMessage
      )
      .toBe("");
  }
);

test.each(["project", "visitor"] as const)(
  "Email %s mode clears custom recipients without the redundant reset button",
  async (mode) => {
    $instances.set(
      new Map([
        [
          "form",
          {
            id: "form",
            type: "instance",
            component: "NativeForm",
            children: [{ type: "id", value: "contact-input" }],
          },
        ],
        [
          "contact-input",
          {
            id: "contact-input",
            type: "instance",
            component: "Input",
            children: [],
          },
        ],
      ])
    );
    $props.set(
      new Map([
        [
          "contact-name",
          {
            id: "contact-name",
            instanceId: "contact-input",
            name: "name",
            type: "string",
            value: "contact",
          },
        ],
        [
          "contact-type",
          {
            id: "contact-type",
            instanceId: "contact-input",
            name: "type",
            type: "string",
            value: "email",
          },
        ],
      ])
    );
    $projectSettings.set({
      meta: { contactEmail: "project@example.com" },
      compiler: {},
    });
    $resources.set(
      new Map([
        [
          "email",
          {
            id: "email",
            name: "Notify",
            control: "email",
            method: "post",
            url: '""',
            headers: [],
            email: {
              recipientMode: "custom",
              recipients: "custom@example.com",
              visitorEmailField: "contact",
            },
          },
        ],
      ])
    );
    const container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () =>
      root?.render(
        createElement(
          TooltipProvider,
          undefined,
          createElement(EmailResourceForm, {
            variable: {
              id: "variable",
              name: "Notify",
              type: "resource",
              scopeInstanceId: "form",
              resourceId: "email",
            },
          })
        )
      )
    );
    expect(container.textContent).not.toContain("Reset to project default");
    const recipientLabels = Array.from(
      container.querySelectorAll("label")
    ).filter((label) => label.textContent === "Recipients");
    expect(recipientLabels).toHaveLength(1);
    expect(
      recipientLabels[0].parentElement?.contains(
        container.querySelector("textarea")
      )
    ).toBe(true);
    expect(container.querySelector("textarea")?.value).toBe(
      "custom@example.com"
    );
    const select =
      container.querySelector<HTMLButtonElement>('[role="combobox"]')!;
    await act(async () => await userEvent.click(select));
    const option = Array.from(
      document.querySelectorAll<HTMLElement>('[role="option"]')
    ).find(
      (option) =>
        option.textContent ===
        (mode === "project"
          ? "Project recipients (or owner)"
          : "Visitor email field")
    )!;
    await act(async () => await userEvent.click(option));
    const settings = JSON.parse(
      container.querySelector<HTMLInputElement>('input[name="email-settings"]')!
        .value
    );
    expect(settings.recipientMode).toBe(
      mode === "project" ? undefined : "visitor"
    );
    expect(settings).not.toHaveProperty("recipients");
    expect(settings.visitorEmailField).toBe("contact");
    if (mode === "project") {
      expect(
        resolveEmailResourceSettings({
          settings,
          projectMeta: { contactEmail: "project@example.com" },
        }).recipients
      ).toMatchObject([{ address: "project@example.com" }]);
      expect(
        resolveEmailResourceSettings({
          settings,
          ownerEmail: "owner@example.com",
        }).recipients
      ).toMatchObject([{ address: "owner@example.com" }]);
      expect(container.textContent).toContain("Project recipients (or owner)");
    } else {
      expect(container.textContent).toContain("Visitor email field");
      expect(container.textContent).toContain("contact");
      expect(
        Array.from(container.querySelectorAll("label")).some(
          (label) => label.textContent === "Visitor email field"
        )
      ).toBe(false);
      expect(container.textContent).not.toContain(
        "A fixed receipt with the site URL is added before the body."
      );
    }
    expect(
      Array.from(
        container.querySelectorAll("textarea"),
        (textarea) => textarea.value
      )
    ).not.toContain("custom@example.com");
  }
);
