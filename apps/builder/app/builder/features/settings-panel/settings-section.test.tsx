// Verifies that Content Block template identity is exposed separately from the
// editable canvas label without changing settings for ordinary instances.
import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import {
  blockTemplateComponent,
  elementComponent,
  type Instance,
} from "@webstudio-is/sdk";
import { selectInstance } from "~/shared/nano-states";
import { $instances } from "~/shared/sync/data-stores";
import { $externalContentRoots } from "~/shared/external-content-mutations";
import { SettingsSection } from "./settings-section";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  $externalContentRoots.set(new Map());
});

afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = "";
  selectInstance(undefined);
  $instances.set(new Map());
  $externalContentRoots.set(new Map());
});

const renderSettings = (instances: Instance[], selectedId: string) => {
  $instances.set(new Map(instances.map((instance) => [instance.id, instance])));
  selectInstance([selectedId]);
  act(() => {
    root.render(
      <TooltipProvider>
        <SettingsSection />
      </TooltipProvider>
    );
  });
};

test("shows stable template name separately from its display label", () => {
  renderSettings(
    [
      {
        type: "instance",
        id: "templates",
        component: blockTemplateComponent,
        children: [{ type: "id", value: "card" }],
      },
      {
        type: "instance",
        id: "card",
        component: "Box",
        name: "PromotionCard",
        label: "Promotion card for launches",
        children: [],
      },
    ],
    "card"
  );

  expect(container.querySelectorAll("input")).toHaveLength(2);
  expect(container.textContent).toContain("Name");
  expect(container.textContent).toContain("Label");
  expect(
    Array.from(container.querySelectorAll<HTMLInputElement>("input")).map(
      ({ value }) => value
    )
  ).toEqual(["PromotionCard", "Promotion card for launches"]);
});

test("humanizes the template name as the default label", () => {
  renderSettings(
    [
      {
        type: "instance",
        id: "templates",
        component: blockTemplateComponent,
        children: [{ type: "id", value: "div" }],
      },
      {
        type: "instance",
        id: "div",
        component: elementComponent,
        tag: "div",
        name: "Div",
        children: [],
      },
    ],
    "div"
  );

  const [name, label] = container.querySelectorAll<HTMLInputElement>("input");
  expect(name?.value).toBe("Div");
  expect(label?.value).toBe("");
  expect(label?.placeholder).toBe("Div");
});

test("keeps ordinary instances on the label-only settings", () => {
  renderSettings(
    [
      {
        type: "instance",
        id: "box",
        component: "Box",
        label: "Regular box",
        children: [],
      },
    ],
    "box"
  );

  expect(container.querySelectorAll("input")).toHaveLength(1);
  expect(container.textContent).not.toContain("Name");
  expect(container.textContent).toContain("Label");
});
