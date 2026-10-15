import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { expect, test, vi } from "vitest";
import { userEvent } from "@vitest/browser/context";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  SectionTitle,
  SectionTitleButton,
  TooltipProvider,
  theme,
} from "@webstudio-is/design-system";
import { CollapsibleSectionWithAddButton } from "~/builder/shared/collapsible-section";
import {
  $instances,
  $dataSources,
  $resources,
} from "~/shared/sync/data-stores";
import { FormActionControl } from "./form-action";
import { PlusIcon } from "@webstudio-is/icons";
import type { ControlProps } from "../shared";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// Snapshots were captured by rendering the unmodified FormActionControl from
// PR base 33f7b350bce0d5837e25d1fd4b97270dd8da69b8 in its original padded parent.
// Compare all content leaves and interactive elements; only the add trigger moves.
const measure = (container: HTMLElement) => {
  const origin = container.getBoundingClientRect();
  const rect = (element: Element) => {
    const r = element.getBoundingClientRect();
    return {
      x: r.x - origin.x,
      y: r.y - origin.y,
      width: r.width,
      height: r.height,
    };
  };
  return {
    height: origin.height,
    elements: Array.from(container.querySelectorAll<HTMLElement>("*"))
      .filter(
        (element) =>
          element.closest('[aria-label="Add action"]') === null &&
          (element.matches("[data-list-item], input, button") ||
            (element.childElementCount === 0 && element.textContent?.trim()))
      )
      .map((element) => ({
        name:
          element.getAttribute("aria-label") ??
          element.textContent ??
          element.tagName,
        ...rect(element),
      })),
  };
};

for (const width of [240, 300]) {
  for (const [name, value] of [
    ["navigation", []],
    ["one action and redirect", [{ dataSourceId: "send" }]],
    [
      "two actions and redirect",
      [{ dataSourceId: "send" }, { dataSourceId: "other" }],
    ],
    ["invalid action", "invalid"],
  ] as const) {
    test(`preserves original content geometry: ${name} at ${width}px`, async () => {
      const previous = [
        $instances.get(),
        $dataSources.get(),
        $resources.get(),
      ] as const;
      const container = document.createElement("div");
      container.style.width = `${width}px`;
      document.body.appendChild(container);
      const root = createRoot(container);
      $instances.set(
        new Map([
          [
            "form",
            { type: "instance", id: "form", component: "Form", children: [] },
          ],
        ])
      );
      $dataSources.set(
        new Map(
          ["send", "other"].map((id) => [
            id,
            {
              type: "resource" as const,
              id,
              name: id,
              scopeInstanceId: "form",
              resourceId: id,
            },
          ])
        )
      );
      $resources.set(
        new Map(
          ["send", "other"].map((id) => [
            id,
            {
              id,
              name: id,
              method: "post" as const,
              url: '"https://example.com"',
              headers: [],
            },
          ])
        )
      );
      const props: ControlProps<"form-action"> = {
        instanceId: "form",
        propName: "action",
        prop: {
          id: "action",
          instanceId: "form",
          name: "action",
          type: "json",
          value,
        },
        computedValue: value,
        meta: { type: "json", control: "form-action", required: false },
        onChange: vi.fn(),
      };
      try {
        await act(async () =>
          root.render(
            <TooltipProvider>
              <FormActionControl
                {...props}
                successRedirect={{
                  instanceId: "form",
                  propName: "successRedirect",
                  prop: undefined,
                  computedValue: undefined,
                  meta: { type: "string", control: "url", required: false },
                  onChange: vi.fn(),
                }}
              />
            </TooltipProvider>
          )
        );
        expect(measure(container)).toMatchSnapshot();
      } finally {
        act(() => root.unmount());
        container.remove();
        $instances.set(previous[0]);
        $dataSources.set(previous[1]);
        $resources.set(previous[2]);
      }
    });
  }
}

test("aligns the trigger with Properties and places the menu like Transforms without overlapping rows", async () => {
  const previous = [
    $instances.get(),
    $dataSources.get(),
    $resources.get(),
  ] as const;
  const container = document.createElement("div");
  Object.assign(container.style, {
    position: "fixed",
    right: "0",
    top: "0",
    width: "300px",
  });
  document.body.appendChild(container);
  const root = createRoot(container);
  $instances.set(
    new Map([
      [
        "form",
        { type: "instance", id: "form", component: "Form", children: [] },
      ],
    ])
  );
  $dataSources.set(
    new Map([
      [
        "send",
        {
          type: "resource",
          id: "send",
          name: "Send request",
          scopeInstanceId: "form",
          resourceId: "send",
        },
      ],
    ])
  );
  $resources.set(
    new Map([
      [
        "send",
        {
          id: "send",
          name: "send",
          method: "post",
          url: '"https://example.com"',
          headers: [],
        },
      ],
    ])
  );
  try {
    await act(async () =>
      root.render(
        <TooltipProvider>
          <div data-properties>
            <CollapsibleSectionWithAddButton
              label="Properties & attributes"
              onAdd={vi.fn()}
            >
              <div />
            </CollapsibleSectionWithAddButton>
          </div>
          <FormActionControl
            instanceId="form"
            propName="action"
            prop={{
              id: "action",
              instanceId: "form",
              name: "action",
              type: "json",
              value: [{ dataSourceId: "send" }],
            }}
            computedValue={undefined}
            meta={{ type: "json", control: "form-action", required: false }}
            onChange={vi.fn()}
          />
          <SectionTitle
            suffix={
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SectionTitleButton
                    aria-label="Add transform"
                    prefix={<PlusIcon />}
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  collisionPadding={16}
                  css={{ width: theme.spacing[24] }}
                >
                  <DropdownMenuItem>Translate</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            }
          >
            Transforms
          </SectionTitle>
        </TooltipProvider>
      )
    );
    const action = container.querySelector<HTMLButtonElement>(
      '[aria-label="Add action"]'
    )!;
    const property = Array.from(
      container.querySelectorAll<HTMLButtonElement>("[data-properties] button")
    ).find(
      (button) =>
        button.getBoundingClientRect().width > 0 &&
        getComputedStyle(button).visibility !== "hidden" &&
        button.dataset.buttonColor === "ghost"
    )!;
    const transform = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        '[aria-label="Add transform"]'
      )
    ).find((button) => getComputedStyle(button).visibility !== "hidden")!;
    const actionRect = action.getBoundingClientRect();
    expect(actionRect.right).toBe(property.getBoundingClientRect().right);
    expect(actionRect.right).toBe(transform.getBoundingClientRect().right);
    expect(actionRect.width).toBe(property.getBoundingClientRect().width);
    expect(actionRect.height).toBe(property.getBoundingClientRect().height);
    expect(action.tabIndex).toBe(0);
    const row = container.querySelector<HTMLElement>("[data-list-item]")!;
    const rowRect = row.getBoundingClientRect();
    expect(actionRect.bottom).toBeLessThanOrEqual(rowRect.top);
    expect(
      document
        .elementFromPoint(rowRect.x + rowRect.width / 2, rowRect.y + 1)
        ?.closest("[data-list-item]")
    ).toBe(row);
    expect(
      document
        .elementFromPoint(actionRect.x + 2, actionRect.bottom - 1)
        ?.closest('[aria-label="Add action"]')
    ).toBe(action);
    await act(async () => userEvent.click(action));
    const actionMenu = document
      .querySelector('[role="menu"]')!
      .getBoundingClientRect();
    expect(actionMenu.left).toBeGreaterThanOrEqual(
      container.getBoundingClientRect().left
    );
    expect(actionMenu.right).toBeLessThanOrEqual(
      container.getBoundingClientRect().right
    );
    expect(actionMenu.top).toBeGreaterThanOrEqual(actionRect.bottom);
    await act(async () => userEvent.keyboard("{Escape}"));
    await act(async () => userEvent.click(transform));
    const transformMenu = document
      .querySelector('[role="menu"]')!
      .getBoundingClientRect();
    expect(actionMenu.right).toBe(transformMenu.right);
    expect(actionMenu.top - actionRect.bottom).toBe(
      transformMenu.top - transform.getBoundingClientRect().bottom
    );
    await act(async () => userEvent.keyboard("{Escape}"));
    const label = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Action"
    )!;
    await act(async () => userEvent.click(label));
    expect(document.querySelector('[role="tooltip"]')?.textContent).toContain(
      "Sends each form submission to all destinations at the same time."
    );
  } finally {
    act(() => root.unmount());
    container.remove();
    $instances.set(previous[0]);
    $dataSources.set(previous[1]);
    $resources.set(previous[2]);
  }
});
