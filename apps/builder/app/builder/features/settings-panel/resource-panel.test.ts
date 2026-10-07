import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { page, userEvent } from "@vitest/browser/context";
import { afterEach, expect, test, vi } from "vitest";
import {
  encodeDataVariableId,
  type DataSources,
  type Resource,
} from "@webstudio-is/sdk";
import { computeExpression } from "@webstudio-is/project-build/runtime";
import { FloatingPanel, TooltipProvider } from "@webstudio-is/design-system";
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
  document.body.innerHTML = "";
});

test("Email Resource Sender override can be reset to the project default", async () => {
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
  const reset = Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent?.includes("Reset to project default")
  );
  expect(reset).toBeDefined();
  await act(async () => userEvent.click(reset!));
  expect(container.querySelector("textarea")?.value).toBe(
    "Project <project@example.com>"
  );
  expect(
    JSON.parse(
      container.querySelector<HTMLInputElement>('input[name="email-settings"]')
        ?.value ?? "{}"
    )
  ).not.toHaveProperty("sender");
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
  expect(container.textContent).toContain(
    "This Form binding is unavailable outside its Form."
  );
});

test("visitor Email Resource selects a named Form email field", () => {
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
  expect(container.textContent).toContain(
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

test("a GET Resource in a Form shows its effective POST body controls", () => {
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
          "submission",
          {
            id: "submission",
            instanceId: "form",
            name: "submission",
            type: "json",
            value: { destinations: [variable.id] },
          },
        ],
      ])
    );
  });
  expect(container.textContent).toContain("Form submissions use POST");
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

  expect(container.textContent).toContain("Request encoding");
  expect(container.textContent).toContain("Manual body content type");

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
  expect(container.textContent).toContain("Request encoding");
  await act(async () => page.getByLabelText("Request encoding").click());
  await act(async () => page.getByRole("option", { name: "json" }).click());
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
  };
  const internal = getResourceScopeForInstance({
    ...input,
    formScopeInstanceId: "form",
  });
  expect(internal.aliases.get(encodeDataVariableId("formDataId"))).toBe(
    "formData"
  );
  expect(internal.scope[encodeDataVariableId("formDataId")]).toEqual({});
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
