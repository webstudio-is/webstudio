import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, describe, expect, test, vi } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import { ShareProject, type LinkOptions } from "./share-project";

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

const renderShareProject = ({
  onChange,
}: {
  onChange: (value: LinkOptions) => void;
}) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  act(() => {
    root?.render(
      createElement(TooltipProvider, {
        children: createElement(ShareProject, {
          links: [link],
          onChange,
          onDelete: vi.fn(),
          onCreate: vi.fn(),
          builderUrl: ({ authToken }) =>
            `https://example.com?token=${authToken}`,
          isPending: false,
          allowAdditionalPermissions: true,
          isFreePlan: false,
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
  test("saves share link permission changes when link options close", () => {
    const onChange = vi.fn();
    renderShareProject({ onChange });

    const optionsButton = getElement('[aria-label="Menu Button for options"]');
    click(optionsButton);
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
});
