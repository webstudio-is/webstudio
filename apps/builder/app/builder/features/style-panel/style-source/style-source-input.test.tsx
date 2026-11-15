import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { expect, test, vi } from "vitest";
import { userEvent } from "@vitest/browser/context";
import { TooltipProvider } from "@webstudio-is/design-system";
import {
  copyDesignToken,
  copyStyleSourceTransfer,
} from "@webstudio-is/project-build/runtime";
import {
  __testing__ as inputTesting,
  StyleSourceInput,
} from "./style-source-input";
import { StyleSourceMenu } from "./style-source-menu";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

test("pastes copied Tokens and Tag styles while leaving ordinary text to the input", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const onPasteStyleSource = vi.fn();
  const tokenData = copyDesignToken(
    {
      assets: new Map(),
      breakpoints: new Map(),
      styleSources: new Map([
        ["token", { type: "token", id: "token", name: "Button" }],
      ]),
      styleSourceSelections: new Map(),
      styles: new Map(),
    },
    { tokenId: "token" }
  ).data;
  const tagStyleData = copyStyleSourceTransfer(
    {
      assets: new Map(),
      breakpoints: new Map(),
      styleSources: new Map(),
      styleSourceSelections: new Map(),
      styles: new Map(),
    },
    { styleSourceId: "tag-style:button", sourceType: "tag" }
  ).data;
  const localData = copyStyleSourceTransfer(
    {
      assets: new Map(),
      breakpoints: new Map(),
      styleSources: new Map(),
      styleSourceSelections: new Map(),
      styles: new Map(),
    },
    { styleSourceId: "temporary-local", sourceType: "local" }
  ).data;

  try {
    act(() =>
      root.render(
        <StyleSourceInput
          inputRef={() => {}}
          selectedItemSelector={undefined}
          onPasteStyleSource={onPasteStyleSource}
        />
      )
    );
    const input = container.querySelector("input")!;
    const paste = (text: string) => {
      const clipboardData = new DataTransfer();
      clipboardData.setData("text/plain", text);
      const event = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData,
      });
      act(() => input.dispatchEvent(event));
      return event;
    };

    expect(paste(tokenData).defaultPrevented).toBe(true);
    expect(onPasteStyleSource).toHaveBeenCalledExactlyOnceWith(tokenData);
    expect(paste(tagStyleData).defaultPrevented).toBe(true);
    expect(onPasteStyleSource).toHaveBeenLastCalledWith(tagStyleData);
    expect(paste(localData).defaultPrevented).toBe(true);
    expect(onPasteStyleSource).toHaveBeenLastCalledWith(localData);
    expect(paste("Button").defaultPrevented).toBe(false);
    expect(paste('{"other":"value"}').defaultPrevented).toBe(false);
    expect(onPasteStyleSource).toHaveBeenCalledTimes(3);
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});

test.each([
  ["tag", "tag-style:button", "button"],
  ["local", "temporary-local", "Local"],
] as const)(
  "copies the selected %s source from its menu",
  (source, id, label) => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const onCopy = vi.fn();
    try {
      act(() =>
        root.render(
          <StyleSourceMenu
            open
            onOpenChange={() => {}}
            selectedItemSelector={undefined}
            item={{
              id,
              label,
              source,
              disabled: false,
              locked: false,
              states: [],
            }}
            hasStyles
            states={[]}
            onCopy={onCopy}
          />
        )
      );
      const copy = Array.from(
        document.querySelectorAll<HTMLElement>('[role="menuitem"]')
      ).find((item) => item.textContent === "Copy");
      expect(copy).toBeDefined();
      act(() => copy?.click());
      expect(onCopy).toHaveBeenCalledExactlyOnceWith(id);
    } finally {
      act(() => root.unmount());
      container.remove();
    }
  }
);

test("describes Copy and keeps the style source menu width stable", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    act(() =>
      root.render(
        <StyleSourceMenu
          open
          onOpenChange={() => {}}
          selectedItemSelector={undefined}
          item={{
            id: "tag-style:button",
            label: "button",
            source: "tag",
            disabled: false,
            locked: false,
            states: [":hover"],
          }}
          hasStyles
          states={[
            {
              type: "state",
              selector: ":hover",
              label: ":hover",
              description:
                "Apply styles while the pointer is over this element.",
            },
          ]}
        />
      )
    );

    const copy = Array.from(
      document.querySelectorAll<HTMLElement>('[role="menuitem"]')
    ).find((item) => item.textContent === "Copy")!;
    act(() => copy.focus());
    const menu = document.querySelector<HTMLElement>('[role="menu"]')!;
    const copyDescription = menu.getBoundingClientRect().width;
    expect(menu.textContent).toContain(
      "Copy this source’s styles to paste them elsewhere."
    );

    const hover = Array.from(
      document.querySelectorAll<HTMLElement>('[role="menuitem"]')
    ).find((item) => item.textContent?.trim() === ":hover")!;
    act(() => hover.focus());
    expect(menu.getBoundingClientRect().width).toBe(copyDescription);
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});

test("describes the supported selectors when Add more receives focus", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    act(() =>
      root.render(
        <StyleSourceMenu
          open
          onOpenChange={() => {}}
          selectedItemSelector={undefined}
          item={{
            id: "tag-style:button",
            label: "button",
            source: "tag",
            disabled: false,
            locked: false,
            states: [],
          }}
          hasStyles={false}
          states={[]}
        />
      )
    );
    const input = document.querySelector<HTMLInputElement>(
      "[role=menu] form input"
    );
    expect(input).not.toBeNull();
    act(() => input?.focus());
    expect(document.querySelector("[role=menu]")?.textContent).toContain(
      "Start with a tag, such as h2, h2:hover, or h2::before"
    );
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});

test("disables Copy when a source has no declarations", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const onCopy = vi.fn();
  try {
    act(() =>
      root.render(
        <StyleSourceMenu
          open
          onOpenChange={() => {}}
          selectedItemSelector={undefined}
          item={{
            id: "tag-style:button",
            label: "button",
            source: "tag",
            disabled: false,
            locked: false,
            states: [":hover"],
          }}
          hasStyles={false}
          states={[]}
          onCopy={onCopy}
        />
      )
    );
    const copy = Array.from(
      document.querySelectorAll<HTMLElement>('[role="menuitem"]')
    ).find((item) => item.textContent === "Copy")!;
    expect(copy.getAttribute("aria-disabled")).toBe("true");
    act(() => copy.click());
    expect(onCopy).not.toHaveBeenCalled();
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});

test("does not treat selectors alone as copyable styles", () => {
  const hasStyles = inputTesting.getHasStylesMap(
    [
      {
        id: "tag-style:button",
        label: "button",
        source: "tag",
        disabled: false,
        locked: false,
        states: [":hover"],
      },
    ],
    new Map()
  );

  expect(hasStyles.get("tag-style:button")).toBeUndefined();
});

test("allows Copy for styles on inactive states or breakpoints", () => {
  const hasStyles = inputTesting.getHasStylesMap(
    [
      {
        id: "tag-style:button",
        label: "button",
        source: "tag",
        disabled: false,
        locked: false,
        states: [],
      },
    ],
    new Map([["tag-style:button", [{ styleSourceId: "tag-style:button" }]]])
  );

  expect(hasStyles.get("tag-style:button")).toBe(true);
});

test("navigates style sources and restores input focus after Escape", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const onSelectAutocompleteItem = vi.fn();
  const sources = [
    { id: "tag-style:button", label: "button", source: "tag" as const },
    { id: "token-one", label: "One", source: "token" as const },
    { id: "token-two", label: "Two", source: "token" as const },
    { id: "local", label: "Local", source: "local" as const },
  ].map((item) => ({
    ...item,
    disabled: false,
    locked: false,
    states: [],
  }));

  try {
    act(() =>
      root.render(
        <TooltipProvider>
          <StyleSourceInput
            inputRef={() => {}}
            selectedItemSelector={undefined}
            items={sources}
            value={sources}
            onSelectAutocompleteItem={onSelectAutocompleteItem}
          />
        </TooltipProvider>
      )
    );

    const input = container.querySelector<HTMLInputElement>("input")!;
    const press = (element: Element, key: string) =>
      element.dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
      );
    const sourceButton = (id: string) =>
      container.querySelector<HTMLElement>(`[data-id="${id}"] button`)!;

    act(() => input.focus());
    act(() => press(input, "ArrowDown"));
    expect(input.getAttribute("aria-activedescendant")).toBeTruthy();
    act(() => {
      input.setSelectionRange(0, 0);
      press(input, "ArrowLeft");
    });
    await act(async () => Promise.resolve());
    expect(onSelectAutocompleteItem).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(sourceButton("token-two"));
    expect(sourceButton("token-two").matches(":focus-visible")).toBe(true);

    act(() => press(sourceButton("token-two"), "ArrowRight"));
    expect(document.activeElement).toBe(input);

    act(() => {
      input.setSelectionRange(input.value.length, input.value.length);
      press(input, "ArrowRight");
    });
    expect(document.activeElement).toBe(sourceButton("local"));

    act(() => press(sourceButton("local"), "ArrowLeft"));
    expect(document.activeElement).toBe(input);

    act(() => press(sourceButton("token-two"), "ArrowDown"));
    const menu = document.querySelector('[role="menu"]');
    expect(menu).not.toBeNull();
    await act(async () => {
      press(menu!, "Escape");
      await Promise.resolve();
    });
    expect(document.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(input);
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});

test("opens suggestions on input focus and waits for another action after Escape", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const token = {
    id: "token-one",
    label: "One",
    source: "token" as const,
    disabled: false,
    locked: false,
    states: [],
  };
  try {
    act(() =>
      root.render(
        <TooltipProvider>
          <StyleSourceInput
            inputRef={() => {}}
            selectedItemSelector={undefined}
            items={[token]}
          />
        </TooltipProvider>
      )
    );
    const input = container.querySelector<HTMLInputElement>("input")!;
    const press = (key: string, keyCode: number) => {
      const event = new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, "keyCode", { value: keyCode });
      act(() => input.dispatchEvent(event));
    };

    act(() => input.focus());
    expect(document.querySelector('[role="listbox"]')).not.toBeNull();

    await act(async () => {
      press("Escape", 27);
      await Promise.resolve();
    });
    expect(document.querySelector('[role="listbox"]')).toBeNull();
    expect(document.activeElement).toBe(input);

    press("ArrowDown", 40);
    expect(document.querySelector('[role="listbox"]')).not.toBeNull();
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});

test("arrow navigation reaches the Add more input and allows typing", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    act(() =>
      root.render(
        <StyleSourceMenu
          open
          onOpenChange={() => {}}
          selectedItemSelector={undefined}
          item={{
            id: "tag-style:button",
            label: "button",
            source: "tag",
            disabled: false,
            locked: false,
            states: [":hover"],
          }}
          hasStyles
          states={[{ type: "state", selector: ":hover", label: ":hover" }]}
        />
      )
    );
    const menu = document.querySelector<HTMLElement>('[role="menu"]')!;
    const state = Array.from(
      menu.querySelectorAll<HTMLElement>('[role="menuitem"]')
    ).find((item) => item.textContent?.trim() === ":hover")!;
    const input = menu.querySelector<HTMLInputElement>("form input")!;
    expect(input.closest('[role="menuitem"]')).not.toBeNull();
    await act(async () => Promise.resolve());
    act(() => state.focus());
    expect(document.activeElement).toBe(state);
    await act(async () => userEvent.keyboard("{ArrowDown}"));
    expect(document.activeElement).toBe(input);
    await act(async () => userEvent.keyboard("h2"));
    expect(input.value).toBe("h2");
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});

test("keeps the selected Tag style first in arrow-key autocomplete", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const tagStyle = {
    id: "tag-style:button",
    label: "button",
    source: "tag" as const,
    disabled: false,
    locked: false,
    states: [],
  };
  const token = {
    id: "token-one",
    label: "One",
    source: "token" as const,
    disabled: false,
    locked: false,
    states: [],
  };
  const onSelectAutocompleteItem = vi.fn();
  try {
    act(() =>
      root.render(
        <TooltipProvider>
          <StyleSourceInput
            inputRef={() => {}}
            selectedItemSelector={undefined}
            items={[tagStyle, token]}
            value={[tagStyle]}
            onSelectAutocompleteItem={onSelectAutocompleteItem}
          />
        </TooltipProvider>
      )
    );

    const input = container.querySelector<HTMLInputElement>("input")!;
    const press = (key: string, keyCode: number) => {
      const event = new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, "keyCode", { value: keyCode });
      input.dispatchEvent(event);
    };
    act(() => input.focus());
    act(() => press("ArrowDown", 40));
    act(() => press("Enter", 13));

    expect(onSelectAutocompleteItem).toHaveBeenCalledWith(
      expect.objectContaining({ id: tagStyle.id, source: "tag" })
    );
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});

test("keeps menu arrow keys from toggling the outer combobox", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const onOuterKeyDown = vi.fn();
  try {
    act(() =>
      root.render(
        <div onKeyDown={onOuterKeyDown}>
          <StyleSourceMenu
            open
            onOpenChange={() => {}}
            selectedItemSelector={undefined}
            item={{
              id: "token",
              label: "Token",
              source: "token",
              disabled: false,
              locked: false,
              states: [],
            }}
            hasStyles
            states={[]}
          />
        </div>
      )
    );

    const menu = document.querySelector<HTMLElement>('[role="menu"]')!;
    act(() =>
      menu.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "ArrowDown",
          bubbles: true,
          cancelable: true,
        })
      )
    );
    expect(onOuterKeyDown).not.toHaveBeenCalled();
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});
