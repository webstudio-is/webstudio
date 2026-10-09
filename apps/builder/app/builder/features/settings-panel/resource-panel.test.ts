import { createElement, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { page, userEvent } from "@vitest/browser/context";
import { afterEach, expect, test, vi } from "vitest";
import {
  encodeDataVariableId,
  ROOT_INSTANCE_ID,
  resolveEmailResourceSettings,
  type DataSource,
  type DataSources,
  type Resource,
} from "@webstudio-is/sdk";
import {
  computeExpression,
  encodeDataVariableName,
} from "@webstudio-is/project-build/runtime";
import { createDefaultPages } from "@webstudio-is/project-build";
import { FloatingPanel, TooltipProvider } from "@webstudio-is/design-system";
import {
  $builderMode,
  $selectedPageId,
  $variableValuesByInstanceSelector,
  selectInstance,
} from "~/shared/nano-states";
import {
  $dataSources,
  $instances,
  $projectSettings,
  $pages,
  $props,
  $resources,
} from "~/shared/sync/data-stores";
import { registerContainers } from "~/shared/sync/sync-stores";
import {
  getResourceScopeForInstance,
  EmailResourceForm,
  MethodField,
  Headers,
  ResourceForm,
  UrlField,
  useResourceScope,
} from "./resource-panel";

const { expressionEvaluations } = vi.hoisted(() => ({
  expressionEvaluations: vi.fn(),
}));
vi.mock("~/builder/shared/binding-popover", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("~/builder/shared/binding-popover")>();
  return {
    ...actual,
    evaluateExpressionWithinScope: (
      ...args: Parameters<typeof actual.evaluateExpressionWithinScope>
    ) => {
      expressionEvaluations(...args);
      return actual.evaluateExpressionWithinScope(...args);
    },
  };
});

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
const getCodeMirrorModKey = () =>
  /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? "Meta" : "Control";
registerContainers();
const initialResources = $resources.get();
const initialDataSources = $dataSources.get();
const initialProjectSettings = $projectSettings.get();
const initialInstances = $instances.get();
const initialProps = $props.get();
const initialVariableValuesByInstanceSelector =
  $variableValuesByInstanceSelector.get();
afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  $resources.set(initialResources);
  $dataSources.set(initialDataSources);
  $projectSettings.set(initialProjectSettings);
  $instances.set(initialInstances);
  $props.set(initialProps);
  $variableValuesByInstanceSelector.set(
    initialVariableValuesByInstanceSelector
  );
  $pages.set(undefined);
  $selectedPageId.set(undefined);
  selectInstance(undefined);
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
  expect(
    container.querySelector<HTMLInputElement>(
      'input[placeholder="Acme <acme@example.com>"]'
    )?.value
  ).toBe("Custom <custom@example.com>");
  expect(container.textContent).not.toContain("Reset to project default");
  expect(
    JSON.parse(
      container.querySelector<HTMLInputElement>('input[name="email-settings"]')
        ?.value ?? "{}"
    ).sender
  ).toBe("Custom <custom@example.com>");
});

test("changing another Email field does not reevaluate custom recipients", async () => {
  const recipientExpression = JSON.stringify("team@example.com");
  expressionEvaluations.mockClear();
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
            recipients: "team@example.com",
            sender: "Acme <acme@example.com>",
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

  const recipientEvaluations = () =>
    expressionEvaluations.mock.calls.filter(
      ([expression]) => expression === recipientExpression
    ).length;
  await expect.poll(recipientEvaluations).toBe(1);

  const sender = container.querySelector<HTMLInputElement>(
    'input[placeholder="Acme <acme@example.com>"]'
  )!;
  await act(async () =>
    userEvent.fill(sender, "Support <support@example.com>")
  );
  await expect.poll(() => sender.value).toBe("Support <support@example.com>");
  expect(recipientEvaluations()).toBe(1);
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

  const labels = Array.from(container.querySelectorAll("label")).map(
    (label) => label.textContent
  );
  for (const field of ["Sender", "Recipients", "Subject", "Body"]) {
    expect(labels.filter((label) => label === field)).toHaveLength(1);
  }
  expect(container.textContent).not.toContain("expression");
  expect(
    container.querySelector('input[placeholder="New form submission"]')
  ).not.toBeNull();

  const subjectInput = container.querySelector<HTMLInputElement>(
    'input[placeholder="New form submission"]'
  )!;
  const subjectLabel = Array.from(container.querySelectorAll("label")).find(
    (label) => label.htmlFor === subjectInput.id
  )!;
  const subjectBinding =
    subjectLabel.parentElement?.querySelector<HTMLButtonElement>(
      'button[data-variant="default"]'
    );
  expect(subjectBinding).not.toBeNull();
  await act(async () => await userEvent.hover(subjectBinding!));
  await expect.poll(() => getComputedStyle(subjectBinding!).opacity).toBe("1");
  await act(async () => await userEvent.click(subjectBinding!));
  await expect
    .poll(() => subjectBinding?.getAttribute("aria-expanded"))
    .toBe("true");
  await expect
    .poll(() => document.querySelector('[role="dialog"]')?.textContent)
    .toContain("Expression editor");
});

test("Email Sender and Custom recipients validation is shown in tooltips", async () => {
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
            sender: "not-an-email",
            recipientMode: "custom",
            recipients: "also-not-an-email",
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

  const senderInput = container.querySelector<HTMLInputElement>(
    'input[placeholder="Acme <acme@example.com>"]'
  )!;
  const recipientsInput = container.querySelector<HTMLInputElement>(
    'input[placeholder="Acme <acme@example.com>, team@example.com"]'
  )!;
  expect(senderInput.value).toBe("not-an-email");
  expect(recipientsInput.value).toBe("also-not-an-email");
  expect(container.textContent).not.toContain(
    "Sender must contain exactly one valid email address."
  );
  expect(container.textContent).not.toContain("Contact email is invalid.");

  await act(async () => userEvent.hover(senderInput));
  await expect
    .poll(() => document.body.textContent)
    .toContain("Sender must contain exactly one valid email address.");
  await act(async () => userEvent.hover(recipientsInput));
  await expect
    .poll(() => document.body.textContent)
    .toContain("Contact email is invalid.");
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
  container.style.width = "280px";
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
  const defaultAttachmentOptions =
    container.querySelectorAll<HTMLElement>('[role="radio"]');
  expect(defaultAttachmentOptions[0]?.getAttribute("aria-checked")).toBe(
    "true"
  );
  await act(
    async () =>
      await userEvent.click(defaultAttachmentOptions[1] as HTMLElement)
  );
  expect(
    JSON.parse(
      container.querySelector<HTMLInputElement>('input[name="email-settings"]')
        ?.value ?? "{}"
    ).includeAttachments
  ).toBe(false);
  await act(
    async () =>
      await userEvent.click(defaultAttachmentOptions[0] as HTMLElement)
  );
  expect(
    JSON.parse(
      container.querySelector<HTMLInputElement>('input[name="email-settings"]')
        ?.value ?? "{}"
    ).includeAttachments
  ).toBe(true);
  const recipientSelect =
    container.querySelector<HTMLButtonElement>('[role="combobox"]')!;
  await expect(
    page.getByRole("combobox", { name: "Recipients", exact: true })
  ).toBeVisible();
  await act(async () => await userEvent.click(recipientSelect));
  expect(
    document
      .querySelector<HTMLElement>("[data-radix-popper-content-wrapper]")
      ?.getBoundingClientRect().width
  ).toBe(recipientSelect.getBoundingClientRect().width);
  const recipientDescriptions = document.querySelector(
    '[data-select-description="content"]'
  );
  expect(recipientDescriptions?.textContent).toContain(
    "Send to the project's contact emails or owner."
  );
  expect(recipientDescriptions?.textContent).toContain(
    "Send to the email addresses entered below."
  );
  const customOption = Array.from(
    document.querySelectorAll<HTMLElement>('[role="option"]')
  ).find((option) => option.textContent === "Custom recipients")!;
  await act(async () => await userEvent.click(customOption));
  await expect(
    page.getByRole("textbox", { name: "Custom recipients", exact: true })
  ).toBeVisible();
  expect(
    container.querySelector(
      'input[placeholder="Acme <acme@example.com>, team@example.com"]'
    )
  ).not.toBeNull();
  // Sender, custom Recipients, Subject, and Body all use the binding control.
  expect(
    container.querySelectorAll('button[data-variant="default"]')
  ).toHaveLength(4);

  const attachmentOptions = container.querySelectorAll('[role="radio"]');
  expect(attachmentOptions).toHaveLength(2);
  expect(attachmentOptions[0]?.getAttribute("aria-checked")).toBe("true");
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

test.each(["sender", "recipients"] as const)(
  "Email Resource %s Form binding survives save and reopen",
  async (field) => {
    $builderMode.set("design");
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
        [
          "contact-default-value",
          {
            id: "contact-default-value",
            instanceId: "contact-input",
            name: "defaultValue",
            type: "string",
            value: "contact@example.com",
          },
        ],
      ])
    );
    $dataSources.set(
      new Map([
        [
          "email-variable",
          {
            id: "email-variable",
            type: "resource",
            name: "Notify",
            scopeInstanceId: "form",
            resourceId: "email",
          },
        ],
        [
          "form-data",
          {
            id: "form-data",
            type: "parameter",
            name: "formData",
            scopeInstanceId: "form",
          },
        ],
        [
          "lookup-source",
          {
            id: "lookup-source",
            type: "resource",
            name: "Lookup",
            scopeInstanceId: "form",
            resourceId: "lookup",
          },
        ],
      ])
    );
    $pages.set(createDefaultPages({ rootInstanceId: "form" }));
    $selectedPageId.set("home");
    selectInstance(["form"]);
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
        [
          "lookup",
          {
            id: "lookup",
            name: "Lookup",
            method: "get",
            url: '"https://example.com"',
            headers: [],
          },
        ],
      ])
    );

    const container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    let save: (() => unknown) | undefined;
    let formElement: HTMLFormElement | null = null;
    const render = () => {
      const Form = () => {
        const emailFormRef = useRef<
          | {
              save: (
                formData: FormData
              ) => void | false | { dataSourceId: string };
            }
          | undefined
        >(undefined);
        save = () => emailFormRef.current?.save(new FormData(formElement!));
        return createElement(
          "form",
          {
            ref: (element: HTMLFormElement | null) => {
              formElement = element;
            },
          },
          createElement("input", {
            type: "hidden",
            name: "name",
            value: "Notify",
          }),
          createElement(EmailResourceForm, {
            ref: emailFormRef,
            variable: {
              id: "email-variable",
              type: "resource",
              name: "Notify",
              scopeInstanceId: "form",
              resourceId: "email",
            },
          })
        );
      };
      root?.render(
        createElement(TooltipProvider, undefined, createElement(Form))
      );
    };
    await act(async () => render());

    if (field === "recipients") {
      const recipientsSelect =
        container.querySelector<HTMLButtonElement>('[role="combobox"]')!;
      await act(async () => userEvent.click(recipientsSelect));
      await act(async () =>
        page
          .getByRole("option", { name: "Custom recipients", exact: true })
          .click()
      );
    }

    const fieldInput = container.querySelector<HTMLInputElement>(
      field === "sender"
        ? 'input[placeholder="Acme <acme@example.com>"]'
        : 'input[placeholder="Acme <acme@example.com>, team@example.com"]'
    )!;
    let bindingControl = fieldInput.parentElement;
    while (
      bindingControl !== null &&
      bindingControl.querySelector('button[data-variant="default"]') === null
    ) {
      bindingControl = bindingControl.parentElement;
    }
    const bindingButton = bindingControl?.querySelector<HTMLButtonElement>(
      'button[data-variant="default"]'
    )!;
    expect(bindingButton).not.toBeNull();
    await act(async () => userEvent.hover(bindingButton));
    await expect.poll(() => getComputedStyle(bindingButton).opacity).toBe("1");
    await act(async () => userEvent.click(bindingButton));
    await expect
      .poll(() => bindingButton.getAttribute("aria-expanded"))
      .toBe("true");
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    const expressionEditor = dialog.querySelector<HTMLElement>(".cm-content")!;
    const formDataVariable = Array.from(
      dialog.querySelectorAll<HTMLElement>("[data-list-item]")
    ).find((item) => item.textContent?.startsWith("formData"))!;
    expect(formDataVariable).not.toBeNull();
    expect(
      Array.from(dialog.querySelectorAll<HTMLElement>("[data-list-item]")).some(
        (item) => item.textContent?.startsWith("Lookup")
      )
    ).toBe(false);
    await act(async () => userEvent.click(expressionEditor));
    const expression = `${encodeDataVariableName("formData")}.contact`;
    const savedExpression = `${encodeDataVariableId("form-data")}.contact`;
    const modKey = getCodeMirrorModKey();
    // Replace the default quoted empty string with the Form-scoped variable.
    await act(async () => userEvent.keyboard(`{${modKey}>}a{/${modKey}}`));
    await act(async () => userEvent.click(formDataVariable));
    await act(async () => userEvent.keyboard(".contact"));
    expect(expressionEditor.textContent).toContain(expression);
    const emailSettings = () =>
      JSON.parse(
        container.querySelector<HTMLInputElement>(
          'input[name="email-settings"]'
        )!.value
      );
    const expressionKey =
      field === "sender" ? "senderExpression" : "recipientsExpression";
    await act(async () =>
      userEvent.keyboard(`{${modKey}>}{Enter}{/${modKey}}`)
    );
    await expect
      .poll(() => emailSettings())
      .toMatchObject({ [expressionKey]: savedExpression });
    await act(async () =>
      userEvent.click(
        dialog.querySelector<HTMLButtonElement>('[aria-label="Close"]')!
      )
    );
    await expect
      .poll(() => emailSettings()[expressionKey])
      .toBe(savedExpression);
    await expect
      .poll(() => document.querySelector('[role="dialog"]'))
      .toBeNull();

    const literalKey = field === "sender" ? "sender" : "recipients";
    expect(emailSettings()).toMatchObject({
      [expressionKey]: savedExpression,
    });
    expect(emailSettings()).not.toHaveProperty(literalKey);

    let saveResult: unknown;
    await act(async () => {
      saveResult = save?.();
    });
    expect(saveResult).toMatchObject({ resourceId: "email" });
    expect($resources.get().get("email")?.email).toMatchObject({
      [expressionKey]: savedExpression,
    });
    expect($resources.get().get("email")?.email).not.toHaveProperty(literalKey);

    await act(async () => root?.unmount());
    root = createRoot(container);
    await act(async () => render());
    expect(emailSettings()).toMatchObject({
      [expressionKey]: savedExpression,
    });
    expect(emailSettings()).not.toHaveProperty(literalKey);

    const reopenedInput = container.querySelector<HTMLInputElement>(
      field === "sender"
        ? 'input[placeholder="Acme <acme@example.com>"]'
        : 'input[placeholder="Acme <acme@example.com>, team@example.com"]'
    )!;
    let reopenedControl = reopenedInput.parentElement;
    while (
      reopenedControl !== null &&
      reopenedControl.querySelector('button[data-variant="bound"]') === null
    ) {
      reopenedControl = reopenedControl.parentElement;
    }
    const reopenedButton = reopenedControl?.querySelector<HTMLButtonElement>(
      'button[data-variant="bound"]'
    )!;
    expect(reopenedButton).not.toBeNull();
    await act(async () => userEvent.click(reopenedButton));
    await expect
      .poll(
        () =>
          document.querySelector<HTMLElement>('[role="dialog"] .cm-content')
            ?.textContent
      )
      .toContain(expression);
  }
);

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
  const body = container.querySelector("textarea")!;
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
  const visitorTooltipText =
    "Adds a note with this site’s URL to help recipients identify where the message came from and discourage spam.";
  expect(container.textContent).not.toContain(visitorTooltipText);
  expect(
    container.querySelector('[aria-label="About Visitor email field"]')
  ).not.toBeNull();
  expect(container.textContent).toContain("Attachments");
  const attachmentOptions =
    container.querySelectorAll<HTMLElement>('[role="radio"]');
  expect(attachmentOptions).toHaveLength(2);
  expect(attachmentOptions[0].getAttribute("aria-checked")).toBe("true");
  await act(async () => userEvent.click(attachmentOptions[1]));
  expect(
    JSON.parse(
      container.querySelector<HTMLInputElement>('input[name="email-settings"]')
        ?.value ?? "{}"
    ).includeAttachments
  ).toBe(false);
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
  expect(
    container.querySelector('[aria-label="About Visitor email field"]')
  ).toBeNull();
  await act(async () =>
    userEvent.click(container.querySelector('[role="combobox"]')!)
  );
  await act(async () =>
    page
      .getByRole("option", { name: "Visitor email field", exact: true })
      .click()
  );
  expect(container.textContent).toContain("Attachments");
  expect(attachmentOptions[1].getAttribute("aria-checked")).toBe("true");
  expect(container.textContent).not.toContain(
    "A fixed receipt with the site URL is added before the body."
  );
  expect(container.textContent).not.toContain(
    "Select one named email input in this Form."
  );
  expect(container.textContent).not.toContain(visitorTooltipText);
  const visitorField = Array.from(
    container.querySelectorAll<HTMLButtonElement>('[role="combobox"]')
  ).at(-1);
  await expect(
    page.getByRole("combobox", {
      name: "Visitor email field",
      exact: true,
    })
  ).toBeVisible();
  const visitorInfo = container.querySelector<SVGElement>(
    '[aria-label="About Visitor email field"]'
  )!;
  await act(async () => userEvent.hover(visitorInfo));
  await expect
    .poll(() => document.body.textContent)
    .toContain(visitorTooltipText);
  await act(async () => userEvent.unhover(visitorInfo));
  await expect
    .poll(() => document.body.textContent)
    .not.toContain(visitorTooltipText);
  await act(async () => userEvent.click(visitorField!));
  expect(
    document.querySelector('[data-select-description="content"]')?.textContent
  ).toContain(
    "Choose a Form input to use its value as the recipient email address."
  );
  await act(async () => userEvent.keyboard("{Escape}"));
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

test("unrelated Resource edits preserve recipient scope and aliases", async () => {
  const variable: DataSource = {
    type: "resource",
    id: "email-resource-variable",
    name: "Email",
    scopeInstanceId: "form",
    resourceId: "email-resource",
  };
  const recipient: DataSource = {
    type: "parameter",
    id: "recipient-variable",
    name: "formData",
    scopeInstanceId: "form",
  };
  const emailResource: Resource = {
    id: "email-resource",
    name: "Email",
    control: "email",
    method: "post",
    url: '""',
    headers: [],
  };
  const unrelatedResource: Resource = {
    id: "unrelated-resource",
    name: "Unrelated",
    control: "system",
    method: "get",
    url: '"https://example.com"',
    headers: [],
  };
  $dataSources.set(
    new Map<string, DataSource>([
      [variable.id, variable],
      [recipient.id, recipient],
    ])
  );
  $resources.set(
    new Map([
      [emailResource.id, emailResource],
      [unrelatedResource.id, unrelatedResource],
    ])
  );
  $pages.set(createDefaultPages({ rootInstanceId: "form" }));
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
  $selectedPageId.set("home");
  selectInstance(["form"]);

  let result: ReturnType<typeof useResourceScope> | undefined;
  let renders = 0;
  const ScopeSubscriber = () => {
    result = useResourceScope({ variable });
    renders += 1;
    return null;
  };
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root?.render(createElement(ScopeSubscriber)));

  const initialResult = result;
  expect(initialResult?.scope).toHaveProperty(
    encodeDataVariableId(recipient.id)
  );
  expect(initialResult?.aliases.get(encodeDataVariableId(recipient.id))).toBe(
    recipient.name
  );

  await act(async () =>
    $resources.set(
      new Map([
        [emailResource.id, emailResource],
        [
          unrelatedResource.id,
          { ...unrelatedResource, url: '"https://other.example"' },
        ],
      ])
    )
  );

  expect(renders).toBe(1);
  expect(result).toBe(initialResult);
  expect(result?.scope).toBe(initialResult?.scope);
  expect(result?.aliases).toBe(initialResult?.aliases);
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
  expect(container.textContent).not.toContain("Format");
  expect(container.textContent).not.toContain("Choose how to send the body.");
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
  const methodDescriptions = document.querySelector(
    '[data-select-description="content"]'
  );
  expect(methodDescriptions?.textContent).toContain("Read data from a server.");
  expect(methodDescriptions?.textContent).toContain(
    "Send data to create or process something."
  );
  expect(methodDescriptions?.textContent).toContain(
    "Form submissions use POST."
  );
  expect(methodDescriptions?.textContent).toContain(
    "Replace data on a server."
  );
  expect(methodDescriptions?.textContent).toContain(
    "Delete data from a server."
  );
  await act(async () => userEvent.keyboard("{Escape}"));
  expect(container.textContent).toContain("Format");
  expect(container.textContent).toContain("Choose how to send the body.");
  expect(container.querySelector('[name="body-format"]')).not.toBeNull();
  expect(container.querySelector('textarea[name="body"]')).not.toBeNull();
  expect(resource.method).toBe("get");
});

test("invalidates the preview as soon as a body edit starts", async () => {
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

  expect(container.textContent).toContain("Format");
  expect(container.textContent).not.toContain("Body content type");
  expect(
    Array.from(
      container.querySelectorAll("label"),
      (label) => label.textContent
    )
  ).toContain("Body");

  await act(async () =>
    userEvent.click(
      container.querySelector<HTMLButtonElement>("[role=combobox]")!
    )
  );
  const methodDescriptions = document.querySelector(
    '[data-select-description="content"]'
  );
  expect(methodDescriptions?.textContent).toContain("Read data from a server.");
  expect(methodDescriptions?.textContent).toContain(
    "Send data to create or process something."
  );
  expect(methodDescriptions?.textContent).toContain(
    "Replace data on a server."
  );
  expect(methodDescriptions?.textContent).toContain(
    "Delete data from a server."
  );
  await act(async () => userEvent.keyboard("{Escape}"));

  const body = container.querySelector<HTMLElement>(".cm-content");
  expect(body).not.toBeNull();
  expect(container.querySelector("textarea:not([name])")).toBeNull();
  await act(async () => {
    await userEvent.click(body!);
    await userEvent.keyboard("changed");
  });
  expect(onChange).toHaveBeenCalled();
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
  expect(container.textContent).toContain("Format");
  const explanation = "Choose how to send the body.";
  const formatSelect = page
    .getByRole("combobox", { name: "Format", exact: true })
    .element();
  expect(formatSelect.nextElementSibling?.textContent).toBe(explanation);
  expect(formatSelect.textContent).toContain("multipart/form-data");
  await act(async () =>
    page.getByRole("combobox", { name: "Format", exact: true }).click()
  );
  expect(
    Array.from(
      document.querySelectorAll('[role="option"]'),
      (option) => option.textContent
    )
  ).toHaveLength(3);
  const options = Array.from(
    document.querySelectorAll<HTMLElement>('[role="option"]')
  );
  expect(options.map((option) => option.textContent)).toEqual([
    "auto",
    "application/json",
    "multipart/form-data",
  ]);
  const descriptions = document.querySelector(
    '[data-select-description="content"]'
  );
  expect(descriptions?.textContent).toContain(
    "Uses text/plain for text values, application/json for other values, and multipart/form-data when files are included."
  );
  expect(descriptions?.textContent).toContain(
    "Sends an object or array as JSON."
  );
  expect(descriptions?.textContent).toContain(
    "Sends fields as form data, including files."
  );
  await act(async () => userEvent.hover(options[1]!));
  await expect
    .poll(() => descriptions?.lastElementChild?.textContent)
    .toContain("Sends an object or array as JSON.");
  await act(async () => userEvent.keyboard("{ArrowDown}"));
  await expect
    .poll(() => descriptions?.lastElementChild?.textContent)
    .toContain("Sends fields as form data, including files.");
  await act(async () => userEvent.keyboard("{ArrowUp}{Enter}"));
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

test("HTTP Resource Body editor shows line numbers before maximizing", async () => {
  const resource: Resource = {
    id: "request",
    name: "Request",
    method: "post",
    url: '"https://example.com"',
    headers: [],
    body: '{ name: "Acme" }',
  };
  $resources.set(new Map([[resource.id, resource]]));
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
            resourceId: resource.id,
          },
        })
      )
    )
  );

  expect(container.querySelector(".cm-editor")).not.toBeNull();
  expect(container.querySelector(".cm-lineNumbers")).not.toBeNull();
  expect(container.querySelector('[aria-expanded="true"]')).toBeNull();
});

test.each([
  [
    "header",
    '[aria-label="About headers"]',
    "Headers are name-value pairs sent with the request. Use them to tell the server how to interpret the request or who is making it.",
  ],
  [
    "search param",
    '[aria-label="About search params"]',
    "Search params are name-value pairs added to the URL after ?. Use them to send filters, search terms, or other request options.",
  ],
])(
  "Resource editor describes %s in its info tooltip",
  async (_, selector, explanation) => {
    const resource: Resource = {
      id: "request",
      name: "Request",
      method: "post",
      url: '"https://example.com"',
      headers: [],
      searchParams: [],
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

    expect(container.textContent).not.toContain(explanation);
    await act(async () => userEvent.hover(container.querySelector(selector)!));
    await expect
      .poll(() =>
        Array.from(
          document.querySelectorAll("[data-radix-popper-content-wrapper]"),
          (tooltip) => tooltip.textContent
        ).join(" ")
      )
      .toContain(explanation);

    await act(async () => root?.unmount());
    container.remove();
  }
);

test.each([
  [JSON.stringify('{"a":1}'), "text/plain"],
  [JSON.stringify('{"a":1}'), "text/plain"],
  ["{ a: 1 }", "application/json"],
  ["[1, 2]", "application/json"],
  ["42", "application/json"],
  ["true", "application/json"],
] as const)(
  "infers Auto body content type and editor from %s",
  async (body, mime) => {
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
    expect(container.querySelector(".cm-editor")).not.toBeNull();
    await expect
      .poll(
        () =>
          container.querySelector<HTMLTextAreaElement>('textarea[name="body"]')
            ?.validationMessage
      )
      .toBe("");
  }
);

test.each([
  ["project", "literal", '"custom@example.com"'],
  ["project", "bound", '"custom" + "@example.com"'],
  ["visitor", "literal", '"custom@example.com"'],
  ["visitor", "bound", '"custom" + "@example.com"'],
] as const)(
  "Email %s mode clears %s recipients",
  async (mode, recipientKind, recipientValue) => {
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
            email: { visitorEmailField: "contact" },
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
    const select =
      container.querySelector<HTMLButtonElement>('[role="combobox"]')!;
    await act(async () => await userEvent.click(select));
    await act(async () =>
      page
        .getByRole("option", {
          name: "Custom recipients",
          exact: true,
        })
        .click()
    );

    const customInput = container.querySelector<HTMLInputElement>(
      'input[placeholder="Acme <acme@example.com>, team@example.com"]'
    )!;
    expect(customInput).not.toBeNull();
    const customLabelCount = () =>
      Array.from(container.querySelectorAll("label")).filter(
        (label) => label.textContent === "Recipients"
      ).length;
    expect(customLabelCount()).toBe(1);
    expect(
      Array.from(container.querySelectorAll("label"))
        .find((label) => label.textContent === "Recipients")
        ?.parentElement?.contains(customInput)
    ).toBe(true);

    if (recipientKind === "literal") {
      await act(async () => userEvent.fill(customInput, "custom@example.com"));
    } else {
      const recipientBindingButton =
        container.querySelectorAll<HTMLButtonElement>(
          'button[data-variant="default"]'
        )[0];
      await act(async () => userEvent.hover(recipientBindingButton));
      await expect
        .poll(() => getComputedStyle(recipientBindingButton).opacity)
        .toBe("1");
      await act(async () => userEvent.click(recipientBindingButton));
      await expect
        .poll(() => recipientBindingButton.getAttribute("aria-expanded"))
        .toBe("true");
      const expressionEditor = document.querySelector<HTMLElement>(
        '[role="dialog"] .cm-content'
      )!;
      expect(expressionEditor).not.toBeNull();
      const modKey = getCodeMirrorModKey();
      await act(async () => userEvent.click(expressionEditor));
      await act(
        async () => await userEvent.keyboard(`{${modKey}>}a{/${modKey}}`)
      );
      await act(
        async () => await userEvent.keyboard('"custom" + "@example.com"')
      );
      expect(expressionEditor.textContent).toContain(
        '"custom" + "@example.com"'
      );
      await act(
        async () => await userEvent.keyboard(`{${modKey}>}{Enter}{/${modKey}}`)
      );
      await act(async () => await userEvent.keyboard("{Escape}"));
    }

    const customSettings = JSON.parse(
      container.querySelector<HTMLInputElement>('input[name="email-settings"]')!
        .value
    );
    if (recipientKind === "literal") {
      expect(customSettings.recipients).toBe("custom@example.com");
      expect(customSettings).not.toHaveProperty("recipientsExpression");
    } else {
      expect(customSettings).toMatchObject({
        recipientsExpression: recipientValue,
      });
      expect(customSettings).not.toHaveProperty("recipients");
    }

    const modeSelect =
      container.querySelector<HTMLButtonElement>('[role="combobox"]')!;
    await act(async () => await userEvent.click(modeSelect));
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
    expect(settings).not.toHaveProperty("recipientsExpression");
    expect(settings.visitorEmailField).toBe("contact");
    expect(customLabelCount()).toBe(1);
    expect(
      container.querySelector(
        'input[placeholder="Acme <acme@example.com>, team@example.com"]'
      )
    ).toBeNull();
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
      expect(
        container.querySelectorAll('button[role="combobox"]')
      ).toHaveLength(1);
      expect(
        container.querySelector('input[placeholder="Select an email field"]')
      ).toBeNull();
    } else {
      expect(container.textContent).toContain("Visitor email field");
      expect(container.textContent).toContain("contact");
      const comboboxes = container.querySelectorAll<HTMLButtonElement>(
        'button[role="combobox"]'
      );
      expect(comboboxes).toHaveLength(2);
      expect(comboboxes[1].textContent).toContain("contact");
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

test("Method uses the standard full-width collapsed Select and keeps descriptions in its menu", async () => {
  const container = document.createElement("div");
  container.style.width = "320px";
  document.body.appendChild(container);
  root = createRoot(container);
  const onChange = vi.fn();
  const Harness = () => {
    const [value, setValue] = useState<Resource["method"]>("get");
    return createElement(MethodField, {
      value,
      formDestination: true,
      onChange: (method) => {
        setValue(method);
        onChange(method);
      },
    });
  };
  await act(async () =>
    root?.render(
      createElement(TooltipProvider, undefined, createElement(Harness))
    )
  );
  const trigger =
    container.querySelector<HTMLButtonElement>('[role="combobox"]')!;
  expect(trigger.getAttribute("data-state")).toBe("closed");
  expect(trigger.getBoundingClientRect().width).toBe(
    container.getBoundingClientRect().width
  );
  expect(container.textContent).not.toContain("Read data from a server.");
  expect(document.querySelector('[role="listbox"]')).toBeNull();
  await act(async () => await userEvent.click(trigger));
  expect(
    document
      .querySelector<HTMLElement>("[data-radix-popper-content-wrapper]")
      ?.getBoundingClientRect().width
  ).toBe(trigger.getBoundingClientRect().width);
  const post = Array.from(
    document.querySelectorAll<HTMLElement>('[role="option"]')
  ).find((option) => option.textContent === "Post")!;
  await act(async () => await userEvent.click(post));
  expect(onChange).toHaveBeenLastCalledWith("post");
  expect(trigger.textContent).toContain("Post");
  expect(trigger.getAttribute("data-state")).toBe("closed");
  expect(trigger.getBoundingClientRect().width).toBe(
    container.getBoundingClientRect().width
  );
});
