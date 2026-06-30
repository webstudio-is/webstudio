import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, describe, expect, test, vi } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import { ShareProject, __testing__, type LinkOptions } from "./share-project";

const { getApiPermissionDescription } = __testing__;

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

const link: LinkOptions = {
  token: "token-1",
  name: "Share project",
  relation: "viewers",
  canCopy: false,
  canClone: false,
  canPublish: false,
  canUseApi: false,
};

const getElement = <ElementType extends Element>(selector: string) => {
  const element = document.querySelector<ElementType>(selector);
  if (element === null) {
    throw new Error(`Expected element matching "${selector}"`);
  }
  return element;
};

const getControlByLabel = <ElementType extends HTMLElement>(text: string) => {
  const labels = Array.from(document.querySelectorAll("label"));
  const label = labels.find((label) => label.textContent === text);
  const id = label?.getAttribute("for");
  if (id === undefined || id === null) {
    throw new Error(`Expected label "${text}" to reference a control`);
  }
  const control = document.getElementById(id);
  if (control === null) {
    throw new Error(`Expected control for label "${text}"`);
  }
  return control as ElementType;
};

const hasLabel = (text: string) => {
  return Array.from(document.querySelectorAll("label")).some(
    (label) => label.textContent === text
  );
};

const countLabels = (text: string) => {
  return Array.from(document.querySelectorAll("label")).filter(
    (label) => label.textContent === text
  ).length;
};

const click = (element: Element) => {
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const input = (element: HTMLInputElement, value: string) => {
  act(() => {
    const valueSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    )?.set;
    valueSetter?.call(element, value);
    element.dispatchEvent(new InputEvent("input", { bubbles: true }));
  });
};

const focusOut = (element: Element, relatedTarget: EventTarget) => {
  act(() => {
    element.dispatchEvent(
      new FocusEvent("focusout", { bubbles: true, relatedTarget })
    );
  });
};

const keyDown = (element: Element, key: string) => {
  act(() => {
    element.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key }));
  });
};

const renderShareProject = ({
  allowAdditionalPermissions = true,
  linkOptions = link,
  onChange,
}: {
  allowAdditionalPermissions?: boolean;
  linkOptions?: LinkOptions;
  onChange: (value: LinkOptions) => void;
}) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  act(() => {
    root?.render(
      createElement(TooltipProvider, {
        children: createElement(ShareProject, {
          links: [linkOptions],
          onChange,
          onDelete: vi.fn(),
          onCreate: vi.fn(),
          builderUrl: ({ authToken }) =>
            `https://example.com?token=${authToken}`,
          isPending: false,
          allowAdditionalPermissions,
          isFreePlan: allowAdditionalPermissions === false,
        }),
      })
    );
  });
};

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = undefined;
  document.body.innerHTML = "";
});

describe("ShareProject", () => {
  test("documents api permissions per role", () => {
    expect(
      getApiPermissionDescription({
        role: "viewers",
        canPublish: false,
      })
    ).toBe(
      "Allows read-only API access: inspect permissions, project/build snapshots, pages, folders, instances, text, styles, variables, resources, assets, publish history, domains, and asset usage."
    );
    expect(
      getApiPermissionDescription({
        role: "editors",
        canPublish: false,
      })
    ).toBe(
      "Allows viewer API access and content-mode text and prop changes. Enable Can publish to allow publishing and unpublishing. It cannot change pages, design data, assets, variables, resources, or domains."
    );
    expect(
      getApiPermissionDescription({
        role: "editors",
        canPublish: true,
      })
    ).toBe(
      "Allows viewer API access, content-mode text and prop changes, plus publishing and unpublishing project and custom domains. It cannot change pages, design data, assets, variables, resources, or domains."
    );
    expect(
      getApiPermissionDescription({
        role: "builders",
        canPublish: false,
      })
    ).toBe(
      "Allows read and build API access: pages, folders, instances, text, props, styles, design tokens, CSS variables, data variables, resources, assets, patches, and project-domain publish/unpublish."
    );
    expect(
      getApiPermissionDescription({
        role: "administrators",
        canPublish: true,
      })
    ).toBe(
      "Allows full project API access: all read, content, build, asset, publish/unpublish, and domain management operations."
    );
  });

  test("saves share link permission changes when link options close", () => {
    const onChange = vi.fn();
    renderShareProject({ onChange });

    const optionsButton = getElement('[aria-label="Menu Button for options"]');
    click(optionsButton);

    expect(hasLabel("Can publish")).toBe(false);

    click(getControlByLabel("Editor"));

    const publishCheckbox = getControlByLabel<HTMLButtonElement>("Can publish");
    expect(publishCheckbox.disabled).toBe(false);

    click(publishCheckbox);

    expect(onChange).not.toHaveBeenCalled();

    click(optionsButton);

    expect(onChange).toHaveBeenCalledWith({
      ...link,
      relation: "editors",
      canPublish: true,
    });
  });

  test("shows advanced permissions only for the selected permission", () => {
    const onChange = vi.fn();
    renderShareProject({ onChange });

    click(getElement('[aria-label="Menu Button for options"]'));

    expect(getControlByLabel<HTMLButtonElement>("Can clone")).toBeInstanceOf(
      HTMLButtonElement
    );
    expect(getControlByLabel<HTMLButtonElement>("Can copy")).toBeInstanceOf(
      HTMLButtonElement
    );
    expect(hasLabel("Can publish")).toBe(false);
    expect(countLabels("API")).toBe(1);

    click(getControlByLabel("Builder"));

    expect(hasLabel("Can clone")).toBe(false);
    expect(hasLabel("Can copy")).toBe(false);
    expect(hasLabel("Can publish")).toBe(false);
    expect(countLabels("API")).toBe(1);
  });

  test("saves api permission as an additive capability", () => {
    const onChange = vi.fn();
    renderShareProject({ onChange });

    const optionsButton = getElement('[aria-label="Menu Button for options"]');
    click(optionsButton);

    const apiCheckbox = getControlByLabel<HTMLButtonElement>("API");
    expect(apiCheckbox.disabled).toBe(false);
    click(apiCheckbox);
    click(optionsButton);

    expect(onChange).toHaveBeenCalledWith({
      ...link,
      canUseApi: true,
    });
  });

  test("disables api permission when it requires an upgrade", () => {
    const onChange = vi.fn();
    renderShareProject({
      allowAdditionalPermissions: false,
      onChange,
    });

    const optionsButton = getElement('[aria-label="Menu Button for options"]');
    click(optionsButton);

    const apiCheckbox = getControlByLabel<HTMLButtonElement>("API");
    expect(apiCheckbox.disabled).toBe(true);
    click(apiCheckbox);
    click(optionsButton);

    expect(onChange).not.toHaveBeenCalled();
  });

  test("disables missing api permission when it requires an upgrade", () => {
    const onChange = vi.fn();
    renderShareProject({
      allowAdditionalPermissions: false,
      linkOptions: {
        ...link,
        canUseApi: undefined as unknown as boolean,
      },
      onChange,
    });

    const optionsButton = getElement('[aria-label="Menu Button for options"]');
    click(optionsButton);

    const apiCheckbox = getControlByLabel<HTMLButtonElement>("API");
    expect(apiCheckbox.disabled).toBe(true);
    click(apiCheckbox);
    click(optionsButton);

    expect(onChange).not.toHaveBeenCalled();
  });

  test("allows removing existing api permission without an upgrade", () => {
    const onChange = vi.fn();
    renderShareProject({
      allowAdditionalPermissions: false,
      linkOptions: {
        ...link,
        canUseApi: true,
      },
      onChange,
    });

    const optionsButton = getElement('[aria-label="Menu Button for options"]');
    click(optionsButton);

    const apiCheckbox = getControlByLabel<HTMLButtonElement>("API");
    expect(apiCheckbox.disabled).toBe(false);
    click(apiCheckbox);
    click(optionsButton);

    expect(onChange).toHaveBeenCalledWith({
      ...link,
      canUseApi: false,
    });
  });

  test("keeps api permission when changing high-level permission", () => {
    const onChange = vi.fn();
    renderShareProject({
      linkOptions: {
        ...link,
        canUseApi: true,
      },
      onChange,
    });

    const optionsButton = getElement('[aria-label="Menu Button for options"]');
    click(optionsButton);
    click(getControlByLabel("Builder"));
    click(optionsButton);

    expect(onChange).toHaveBeenCalledWith({
      ...link,
      relation: "builders",
      canUseApi: true,
    });
  });

  test("does not save link name while link options remain open", () => {
    const onChange = vi.fn();
    renderShareProject({ onChange });

    click(getElement('[aria-label="Menu Button for options"]'));

    const nameInput = getElement<HTMLInputElement>('input[name="Name"]');
    const editorSwitch = getControlByLabel("Editor");
    input(nameInput, "Renamed link");
    focusOut(nameInput, editorSwitch);

    expect(onChange).not.toHaveBeenCalled();
  });

  test("saves link name when link options close", () => {
    const onChange = vi.fn();
    renderShareProject({ onChange });

    const optionsButton = getElement('[aria-label="Menu Button for options"]');
    click(optionsButton);

    const nameInput = getElement<HTMLInputElement>('input[name="Name"]');
    input(nameInput, "Renamed link");
    click(optionsButton);

    expect(onChange).toHaveBeenCalledWith({
      ...link,
      name: "Renamed link",
    });
  });

  test("saves current link name when pressing enter immediately after typing", () => {
    const onChange = vi.fn();
    renderShareProject({ onChange });

    click(getElement('[aria-label="Menu Button for options"]'));

    const nameInput = getElement<HTMLInputElement>('input[name="Name"]');
    input(nameInput, "Renamed link");
    keyDown(nameInput, "Enter");

    expect(onChange).toHaveBeenCalledWith({
      ...link,
      name: "Renamed link",
    });
  });
});
