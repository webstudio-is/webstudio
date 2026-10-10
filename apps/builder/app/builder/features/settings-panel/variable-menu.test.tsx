import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { userEvent } from "@vitest/browser/context";
import { afterEach, expect, test, vi } from "vitest";
import { createDefaultPages } from "@webstudio-is/project-build";
import { TooltipProvider } from "@webstudio-is/design-system";
import {
  encodeDataSourceVariable,
  type DataSource,
  type Prop,
} from "@webstudio-is/sdk";
import { $selectedPageId, selectInstance } from "~/shared/nano-states";
import {
  $pages,
  $instances,
  $dataSources,
  $resources,
  $props,
} from "~/shared/sync/data-stores";
import { registerContainers } from "~/shared/sync/sync-stores";
import { VariableContextMenu, VariableMenu } from "./variable-menu";
import { VariablePopoverTrigger } from "./variable-popover";
import { __testing__ as variablesSectionTesting } from "./variables-section";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
registerContainers();
let root: Root | undefined;
afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  selectInstance(undefined);
  $instances.set(new Map());
  $pages.set(undefined);
  $dataSources.set(new Map());
  $resources.set(new Map());
  $props.set(new Map());
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("copy and paste on the same instance creates a unique variable and Resource name", async () => {
  const variable: DataSource = {
    id: "variable",
    type: "resource",
    name: "Request",
    scopeInstanceId: "scope",
    resourceId: "request",
  };
  const other: DataSource = {
    id: "other",
    type: "variable",
    name: "Request 2",
    scopeInstanceId: "scope",
    value: { type: "string", value: "" },
  };
  $instances.set(
    new Map([
      [
        "scope",
        { id: "scope", type: "instance", component: "Box", children: [] },
      ],
    ])
  );
  $pages.set(createDefaultPages({ rootInstanceId: "scope" }));
  $selectedPageId.set("home");
  selectInstance(["scope"]);
  $dataSources.set(
    new Map<string, DataSource>([
      [variable.id, variable],
      [other.id, other],
    ])
  );
  $resources.set(
    new Map([
      [
        "request",
        {
          id: "request",
          name: "Request",
          method: "get",
          url: '\"https://example.com\"',
          headers: [],
        },
      ],
    ])
  );
  let text = "";
  vi.spyOn(navigator.clipboard, "writeText").mockImplementation(
    async (value) => {
      text = value;
    }
  );
  vi.spyOn(navigator.clipboard, "readText").mockImplementation(
    async () => text
  );
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(<VariableMenu variable={variable} canDelete />)
  );
  const open = container.querySelector(
    'button[aria-label="Open variable menu"]'
  )!;
  const action = async (name: string) => {
    await act(async () => userEvent.click(open));
    const item = Array.from(
      document.querySelectorAll<HTMLElement>('[role="menuitem"]')
    ).find((item) => item.textContent === name)!;
    await act(async () => userEvent.click(item));
  };
  await action("Copy");
  await expect.poll(() => text).not.toBe("");
  await action("Paste");
  await expect.poll(() => $dataSources.get().size).toBe(3);
  const pasted = [...$dataSources.get().values()].find(
    ({ name }) => name === "Request 3"
  );
  expect(pasted?.id).not.toBe(variable.id);
  expect(pasted?.type).toBe("resource");
  if (pasted?.type !== "resource") {
    throw Error("Expected a Resource variable");
  }
  const resource = $resources.get().get(pasted.resourceId);
  expect(resource?.id).not.toBe("request");
  expect(resource?.name).toBe("Request 3");
  expect(resource?.url).toBe('\"https://example.com\"');
});

test.each(["formState", "results", "errors"])(
  "required Form variable %s cannot be deleted",
  async (name) => {
    const variable: DataSource = {
      id: `form-${name}`,
      type: "variable",
      name,
      scopeInstanceId: "form",
      value:
        name === "formState"
          ? { type: "string", value: "initial" }
          : { type: "json", value: [] },
    };
    $instances.set(
      new Map([
        [
          "form",
          {
            id: "form",
            type: "instance",
            component: "NativeForm",
            children: [],
          },
        ],
      ])
    );
    $pages.set(createDefaultPages({ rootInstanceId: "form" }));
    $selectedPageId.set("home");
    selectInstance(["form"]);
    $dataSources.set(new Map([[variable.id, variable]]));
    const reference = encodeDataSourceVariable(variable.id);
    const requiredProp: Prop =
      name === "formState"
        ? {
            id: "form-state-binding",
            instanceId: "form",
            name: "state",
            type: "expression",
            value: reference,
          }
        : {
            id: `${name}-binding`,
            instanceId: "form",
            name: "onResultChange",
            type: "action",
            value: [
              {
                type: "execute",
                args: ["result"],
                code: `({ ${name}: ${reference} = result.${name} })`,
              },
            ],
          };
    $props.set(new Map([[requiredProp.id, requiredProp]]));

    const container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () =>
      root?.render(<VariableMenu variable={variable} canDelete />)
    );
    await act(async () =>
      userEvent.click(
        container.querySelector('button[aria-label="Open variable menu"]')!
      )
    );
    const deleteItem = Array.from(
      document.querySelectorAll<HTMLElement>('[role="menuitem"]')
    ).find((item) => item.textContent === "Delete");
    expect(deleteItem?.getAttribute("aria-disabled")).toBe("true");
  }
);

test.each(["formState", "results", "errors"])(
  "renamed required Form variable %s cannot be deleted",
  async (name) => {
    const variable: DataSource = {
      id: `form-${name}`,
      type: "variable",
      name: `renamed ${name}`,
      scopeInstanceId: "form",
      value:
        name === "formState"
          ? { type: "string", value: "initial" }
          : { type: "json", value: [] },
    };
    $instances.set(
      new Map([
        [
          "form",
          {
            id: "form",
            type: "instance",
            component: "NativeForm",
            children: [],
          },
        ],
      ])
    );
    $pages.set(createDefaultPages({ rootInstanceId: "form" }));
    $selectedPageId.set("home");
    selectInstance(["form"]);
    $dataSources.set(new Map([[variable.id, variable]]));
    const reference = encodeDataSourceVariable(variable.id);
    const requiredProp: Prop =
      name === "formState"
        ? {
            id: "form-state-binding",
            instanceId: "form",
            name: "state",
            type: "expression",
            value: reference,
          }
        : {
            id: `${name}-binding`,
            instanceId: "form",
            name: "onResultChange",
            type: "action",
            value: [
              {
                type: "execute",
                args: ["result"],
                code: `({ ${name}: ${reference} = result.${name} })`,
              },
            ],
          };
    $props.set(new Map([[requiredProp.id, requiredProp]]));

    const container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () =>
      root?.render(<VariableMenu variable={variable} canDelete />)
    );
    await act(async () =>
      userEvent.click(
        container.querySelector('button[aria-label="Open variable menu"]')!
      )
    );
    const deleteItem = Array.from(
      document.querySelectorAll<HTMLElement>('[role="menuitem"]')
    ).find((item) => item.textContent === "Delete");
    expect(deleteItem?.getAttribute("aria-disabled")).toBe("true");
  }
);

test.each(["formState", "results", "errors"])(
  "renamed required Form variable %s cannot be deleted from the Edit variable header menu",
  async (name) => {
    const variable: DataSource = {
      id: `form-${name}`,
      type: "variable",
      name: `renamed ${name}`,
      scopeInstanceId: "form",
      value:
        name === "formState"
          ? { type: "string", value: "initial" }
          : { type: "json", value: [] },
    };
    $instances.set(
      new Map([
        [
          "form",
          {
            id: "form",
            type: "instance",
            component: "NativeForm",
            children: [],
          },
        ],
      ])
    );
    $pages.set(createDefaultPages({ rootInstanceId: "form" }));
    $selectedPageId.set("home");
    selectInstance(["form"]);
    $dataSources.set(new Map([[variable.id, variable]]));
    const reference = encodeDataSourceVariable(variable.id);
    const requiredProp: Prop =
      name === "formState"
        ? {
            id: "form-state-binding",
            instanceId: "form",
            name: "state",
            type: "expression",
            value: reference,
          }
        : {
            id: `${name}-binding`,
            instanceId: "form",
            name: "onResultChange",
            type: "action",
            value: [
              {
                type: "execute",
                args: ["result"],
                code: `({ ${name}: ${reference} = result.${name} })`,
              },
            ],
          };
    $props.set(new Map([[requiredProp.id, requiredProp]]));

    const container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () =>
      root?.render(
        <VariablePopoverTrigger variable={variable}>
          <button type="button">Open Edit variable</button>
        </VariablePopoverTrigger>
      )
    );
    await act(async () => userEvent.click(container.querySelector("button")!));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 50)));
    await act(async () =>
      userEvent.click(
        document.querySelector<HTMLButtonElement>(
          '[data-variable-editor-dialog] button[aria-label="Open variable menu"]'
        )!
      )
    );

    const deleteItem = Array.from(
      document.querySelectorAll<HTMLElement>('[role="menuitem"]')
    ).find((item) => item.textContent === "Delete");
    expect(deleteItem?.getAttribute("aria-disabled")).toBe("true");
  }
);

test.each(["formState", "results", "errors"])(
  "renamed required Form variable %s cannot be deleted from the row context menu",
  async (name) => {
    const variable: DataSource = {
      id: `form-${name}`,
      type: "variable",
      name: `renamed ${name}`,
      scopeInstanceId: "form",
      value:
        name === "formState"
          ? { type: "string", value: "initial" }
          : { type: "json", value: [] },
    };
    $instances.set(
      new Map([
        [
          "form",
          {
            id: "form",
            type: "instance",
            component: "NativeForm",
            children: [],
          },
        ],
      ])
    );
    $pages.set(createDefaultPages({ rootInstanceId: "form" }));
    $selectedPageId.set("home");
    selectInstance(["form"]);
    $dataSources.set(new Map([[variable.id, variable]]));
    const reference = encodeDataSourceVariable(variable.id);
    const requiredProp: Prop =
      name === "formState"
        ? {
            id: "form-state-binding",
            instanceId: "form",
            name: "state",
            type: "expression",
            value: reference,
          }
        : {
            id: `${name}-binding`,
            instanceId: "form",
            name: "onResultChange",
            type: "action",
            value: [
              {
                type: "execute",
                args: ["result"],
                code: `({ ${name}: ${reference} = result.${name} })`,
              },
            ],
          };
    $props.set(new Map([[requiredProp.id, requiredProp]]));

    const container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () =>
      root?.render(
        <VariableContextMenu>
          <button data-id={variable.id}>Required Form variable</button>
        </VariableContextMenu>
      )
    );
    const row = container.querySelector("button[data-id]")!;
    await act(async () => {
      row.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          button: 2,
          pointerType: "mouse",
        })
      );
      row.dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          button: 2,
          clientX: 20,
          clientY: 20,
        })
      );
      await new Promise((resolve) => setTimeout(resolve, 1));
    });
    const deleteItem = Array.from(
      document.querySelectorAll<HTMLElement>('[role="menuitem"]')
    ).find((item) => item.textContent === "Delete");
    expect(deleteItem?.getAttribute("aria-disabled")).toBe("true");
  }
);

test("ordinary Form-scoped variable remains deletable from the row context menu", async () => {
  const variable: DataSource = {
    id: "custom-variable",
    type: "variable",
    name: "custom",
    scopeInstanceId: "form",
    value: { type: "string", value: "" },
  };
  $instances.set(
    new Map([
      [
        "form",
        {
          id: "form",
          type: "instance",
          component: "NativeForm",
          children: [],
        },
      ],
    ])
  );
  $pages.set(createDefaultPages({ rootInstanceId: "form" }));
  $selectedPageId.set("home");
  selectInstance(["form"]);
  $dataSources.set(new Map([[variable.id, variable]]));
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <VariableContextMenu>
        <button data-id={variable.id}>Custom variable</button>
      </VariableContextMenu>
    )
  );
  const row = container.querySelector("button[data-id]")!;
  await act(async () => {
    row.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        button: 2,
        pointerType: "mouse",
      })
    );
    row.dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        button: 2,
        clientX: 20,
        clientY: 20,
      })
    );
    await new Promise((resolve) => setTimeout(resolve, 1));
  });
  const deleteItem = Array.from(
    document.querySelectorAll<HTMLElement>('[role="menuitem"]')
  ).find((item) => item.textContent === "Delete");
  expect(deleteItem).not.toBeUndefined();
  expect(deleteItem?.getAttribute("aria-disabled")).not.toBe("true");
});

test("ordinary local variable remains deletable from the Variables row menu", async () => {
  const variable: DataSource = {
    id: "custom-variable",
    type: "variable",
    name: "custom",
    scopeInstanceId: "scope",
    value: { type: "string", value: "" },
  };
  $instances.set(
    new Map([
      [
        "scope",
        { id: "scope", type: "instance", component: "Box", children: [] },
      ],
    ])
  );
  $pages.set(createDefaultPages({ rootInstanceId: "scope" }));
  $selectedPageId.set("home");
  selectInstance(["scope"]);
  $dataSources.set(new Map([[variable.id, variable]]));
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <TooltipProvider>
        <variablesSectionTesting.VariablesItem
          variable={variable}
          source="local"
          index={0}
          value={undefined}
          usageCount={0}
        />
      </TooltipProvider>
    )
  );
  await act(async () =>
    userEvent.hover(container.querySelector('[aria-label="Variable custom"]')!)
  );
  await act(async () =>
    userEvent.click(
      container.querySelector<HTMLButtonElement>(
        'button[aria-label="Open variable menu"]'
      )!
    )
  );

  const deleteItem = Array.from(
    document.querySelectorAll<HTMLElement>('[role="menuitem"]')
  ).find((item) => item.textContent === "Delete");
  expect(deleteItem?.getAttribute("aria-disabled")).not.toBe("true");
});

test("ordinary local variable remains deletable from the Edit variable header menu", async () => {
  const variable: DataSource = {
    id: "custom-variable",
    type: "variable",
    name: "custom",
    scopeInstanceId: "scope",
    value: { type: "string", value: "" },
  };
  $instances.set(
    new Map([
      [
        "scope",
        { id: "scope", type: "instance", component: "Box", children: [] },
      ],
    ])
  );
  $pages.set(createDefaultPages({ rootInstanceId: "scope" }));
  $selectedPageId.set("home");
  selectInstance(["scope"]);
  $dataSources.set(new Map([[variable.id, variable]]));
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <VariablePopoverTrigger variable={variable}>
        <button type="button">Open Edit variable</button>
      </VariablePopoverTrigger>
    )
  );
  await act(async () => userEvent.click(container.querySelector("button")!));
  await act(async () => new Promise((resolve) => setTimeout(resolve, 50)));
  await act(async () =>
    userEvent.click(
      document.querySelector<HTMLButtonElement>(
        '[data-variable-editor-dialog] button[aria-label="Open variable menu"]'
      )!
    )
  );

  const deleteItem = Array.from(
    document.querySelectorAll<HTMLElement>('[role="menuitem"]')
  ).find((item) => item.textContent === "Delete");
  expect(deleteItem?.getAttribute("aria-disabled")).not.toBe("true");
});

test("Edit variable menu offers Delete, Copy, and Refresh without Paste", async () => {
  const variable: DataSource = {
    id: "resource-variable",
    type: "resource",
    name: "Request",
    scopeInstanceId: "scope",
    resourceId: "request",
  };
  $instances.set(
    new Map([
      [
        "scope",
        { id: "scope", type: "instance", component: "Box", children: [] },
      ],
    ])
  );
  $pages.set(createDefaultPages({ rootInstanceId: "scope" }));
  $selectedPageId.set("home");
  selectInstance(["scope"]);
  $dataSources.set(new Map([[variable.id, variable]]));
  const onRefresh = vi.fn();
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <VariableMenu
        variable={variable}
        canDelete
        includePaste={false}
        onRefresh={onRefresh}
      />
    )
  );
  await act(async () =>
    userEvent.click(
      container.querySelector('button[aria-label="Open variable menu"]')!
    )
  );
  const items = Array.from(
    document.querySelectorAll<HTMLElement>('[role="menuitem"]')
  );
  expect(items.map((item) => item.textContent)).toEqual([
    "Delete",
    "Copy",
    "Refresh",
  ]);
  await act(async () => userEvent.click(items[2]!));
  expect(onRefresh).toHaveBeenCalledOnce();
});

test("Edit variable menu has a wider panel while keeping the standard header icon", async () => {
  const variable: DataSource = {
    id: "resource-variable",
    type: "resource",
    name: "Request",
    scopeInstanceId: "scope",
    resourceId: "request",
  };
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <VariableMenu variable={variable} size="header" includePaste={false} />
    )
  );
  const trigger = container.querySelector(
    'button[aria-label="Open variable menu"]'
  )!;
  expect(trigger.querySelector("svg")?.getAttribute("width")).toBe("16");
  await act(async () => userEvent.click(trigger));
  const menu = document.querySelector<HTMLElement>('[role="menu"]');
  expect(menu).not.toBeNull();
  expect(getComputedStyle(menu!).minWidth).toBe("360px");
});

test("the Variables context menu offers variable actions on rows and Paste elsewhere", async () => {
  const variable: DataSource = {
    id: "variable",
    type: "variable",
    name: "Request body",
    scopeInstanceId: "scope",
    value: { type: "string", value: "{}" },
  };
  $instances.set(
    new Map([
      [
        "scope",
        { id: "scope", type: "instance", component: "Box", children: [] },
      ],
    ])
  );
  $pages.set(createDefaultPages({ rootInstanceId: "scope" }));
  $selectedPageId.set("home");
  selectInstance(["scope"]);
  $dataSources.set(new Map([[variable.id, variable]]));
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <VariableContextMenu>
        <button data-id="variable">Request body row</button>
        <button onPointerDown={(event) => event.stopPropagation()}>
          Add variable
        </button>
        <div
          data-testid="blank-panel-space"
          style={{ width: 100, height: 40 }}
        />
      </VariableContextMenu>
    )
  );

  const openContextMenu = async (element: HTMLElement) => {
    await act(async () => {
      element.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          button: 2,
          pointerType: "mouse",
        })
      );
      element.dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          button: 2,
          clientX: 20,
          clientY: 20,
        })
      );
      await new Promise((resolve) => setTimeout(resolve, 1));
    });
  };

  await openContextMenu(container.querySelector('[data-id="variable"]')!);
  const menuItems = () =>
    Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]'));
  expect(menuItems().map((item) => item.textContent)).toEqual([
    "Delete",
    "Copy",
    "Paste",
  ]);
  expect(menuItems()[0]?.getAttribute("aria-disabled")).not.toBe("true");
  await act(async () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  });

  // A keyboard-triggered contextmenu has no pointerdown event.
  const row = container.querySelector('[data-id="variable"]')!;
  await act(async () => {
    row.dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        button: 2,
        clientX: 20,
        clientY: 20,
      })
    );
    await new Promise((resolve) => setTimeout(resolve, 1));
  });
  expect(menuItems()[0]?.getAttribute("aria-disabled")).not.toBe("true");
  await act(async () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  });

  // The Add button stops pointerdown, but its contextmenu must clear the row target.
  await openContextMenu(container.querySelectorAll("button")[1]!);
  expect(menuItems().map((item) => item.textContent)).toEqual([
    "Delete",
    "Copy",
    "Paste",
  ]);
  expect(menuItems()[0]?.getAttribute("aria-disabled")).toBe("true");
  expect(menuItems()[1]?.getAttribute("aria-disabled")).toBe("true");
  expect(menuItems()[2]?.getAttribute("aria-disabled")).not.toBe("true");
  await act(async () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  });

  await openContextMenu(
    container.querySelector('[data-testid="blank-panel-space"]')!
  );
  expect(menuItems()[0]?.getAttribute("aria-disabled")).toBe("true");
  expect(menuItems()[1]?.getAttribute("aria-disabled")).toBe("true");
  expect(menuItems()[2]?.getAttribute("aria-disabled")).not.toBe("true");
});

test("right-clicking inside Edit variable does not open the Variables context menu", async () => {
  const variable: DataSource = {
    id: "variable",
    type: "variable",
    name: "Request body",
    scopeInstanceId: "scope",
    value: { type: "string", value: "{}" },
  };
  $instances.set(
    new Map([
      [
        "scope",
        { id: "scope", type: "instance", component: "Box", children: [] },
      ],
    ])
  );
  $pages.set(createDefaultPages({ rootInstanceId: "scope" }));
  $selectedPageId.set("home");
  selectInstance(["scope"]);
  $dataSources.set(new Map([[variable.id, variable]]));
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <VariableContextMenu>
        <VariablePopoverTrigger variable={variable}>
          <button type="button">Open Edit variable</button>
        </VariablePopoverTrigger>
      </VariableContextMenu>
    )
  );
  await act(async () => userEvent.click(container.querySelector("button")!));
  await act(async () => new Promise((resolve) => setTimeout(resolve, 50)));

  const editor = document.querySelector<HTMLElement>(
    "[data-variable-editor-dialog]"
  );
  expect(editor).not.toBeNull();
  const editorInput = editor!.querySelector<HTMLInputElement>("input");
  expect(editorInput).not.toBeNull();

  const fieldLabel = editor!.querySelector<HTMLElement>("label");
  expect(fieldLabel).not.toBeNull();
  for (const target of [editorInput!, fieldLabel!]) {
    await act(async () => {
      target.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          button: 2,
          pointerType: "mouse",
        })
      );
      target.dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          button: 2,
          clientX: 20,
          clientY: 20,
        })
      );
      await new Promise((resolve) => setTimeout(resolve, 1));
    });
    expect(document.querySelector('[role="menu"]')).toBeNull();
  }
  expect(document.querySelector('[role="dialog"]')).not.toBeNull();
});

test("an inherited page variable cannot be deleted from the context menu", async () => {
  const variable: DataSource = {
    id: "variable",
    type: "parameter",
    name: "System data",
    scopeInstanceId: "parent",
  };
  $instances.set(
    new Map([
      [
        "parent",
        {
          id: "parent",
          type: "instance",
          component: "Box",
          children: [{ type: "id", value: "child" }],
        },
      ],
      [
        "child",
        { id: "child", type: "instance", component: "Box", children: [] },
      ],
    ])
  );
  $pages.set(
    createDefaultPages({
      rootInstanceId: "parent",
      homePageId: "home",
      systemDataSourceId: variable.id,
    })
  );
  $selectedPageId.set("home");
  selectInstance(["child"]);
  $dataSources.set(new Map([[variable.id, variable]]));
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <VariableContextMenu>
        <button data-id="variable">System data row</button>
      </VariableContextMenu>
    )
  );

  const row = container.querySelector('[data-id="variable"]')!;
  await act(async () => {
    row.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        button: 2,
        pointerType: "mouse",
      })
    );
    row.dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        button: 2,
        clientX: 20,
        clientY: 20,
      })
    );
    await new Promise((resolve) => setTimeout(resolve, 1));
  });
  const deleteItem = Array.from(
    document.querySelectorAll<HTMLElement>('[role="menuitem"]')
  ).find((item) => item.textContent === "Delete");
  expect(deleteItem?.getAttribute("aria-disabled")).toBe("true");
});
