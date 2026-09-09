import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test } from "vitest";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import { elementComponent } from "@webstudio-is/sdk";
import { $registeredComponentMetas } from "~/shared/nano-states";
import { __testing__ } from "./inspector";

const { InstanceInfo } = __testing__;

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  document.body.innerHTML = "";
  $registeredComponentMetas.set(new Map());
});

test("shows and truncates the instance label and JSX component name", () => {
  const headingMeta = componentMetas.get("Heading");
  if (headingMeta === undefined) {
    throw new Error("Expected Heading component metadata");
  }
  $registeredComponentMetas.set(
    new Map([
      ["Heading", headingMeta],
      ["HeadingBlaBlubbWithALongComponentName", headingMeta],
      ["@webstudio-is/sdk-components-animation:AnimateChildren", headingMeta],
    ])
  );
  const container = document.createElement("div");
  container.style.width = "120px";
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <InstanceInfo
        instance={{
          type: "instance",
          id: "heading",
          component: "Heading",
          label: "Heading",
          children: [],
        }}
      />
    );
  });
  expect(container.textContent).toContain("Heading<Heading>");
  const shortLabel = container.querySelector<HTMLElement>('[title="Heading"]');
  expect(shortLabel).not.toBeNull();
  expect(shortLabel!.scrollWidth).toBeLessThanOrEqual(shortLabel!.clientWidth);
  expect(container.querySelector("svg")).toBeNull();

  act(() => {
    root.render(
      <InstanceInfo
        instance={{
          type: "instance",
          id: "promotion-card",
          component: elementComponent,
          tag: "div",
          name: "PromotionCard",
          children: [],
        }}
      />
    );
  });
  expect(container.textContent).toContain("Promotion Card<PromotionCard>");

  act(() => {
    root.render(
      <InstanceInfo
        instance={{
          type: "instance",
          id: "div",
          component: elementComponent,
          tag: "div",
          name: "Div",
          children: [],
        }}
      />
    );
  });
  expect(container.textContent).toContain("Div<Div>");

  act(() => {
    root.render(
      <InstanceInfo
        instance={{
          type: "instance",
          id: "heading",
          component: "HeadingBlaBlubbWithALongComponentName",
          label: "Heading bla blubb with a long label",
          children: [],
        }}
      />
    );
  });

  const label = container.querySelector<HTMLElement>(
    '[title="Heading bla blubb with a long label"]'
  );
  const component = container.querySelector<HTMLElement>(
    '[title="<HeadingBlaBlubbWithALongComponentName>"]'
  );
  expect(container.textContent).toContain(
    "Heading bla blubb with a long label<HeadingBlaBlubbWithALongComponentName>"
  );
  expect(label).not.toBeNull();
  expect(component).not.toBeNull();
  expect(getComputedStyle(label!).textOverflow).toBe("ellipsis");
  expect(getComputedStyle(label!).maxWidth).toBe("50%");
  expect(getComputedStyle(label!).flexShrink).toBe("0");
  expect(getComputedStyle(component!).textOverflow).toBe("ellipsis");
  expect(label!.scrollWidth).toBeGreaterThan(label!.clientWidth);
  expect(component!.scrollWidth).toBeGreaterThan(component!.clientWidth);

  act(() => {
    root.render(
      <InstanceInfo
        instance={{
          type: "instance",
          id: "animate-children",
          component: "@webstudio-is/sdk-components-animation:AnimateChildren",
          children: [],
        }}
      />
    );
  });
  expect(container.textContent).toContain("Animate Children<AnimateChildren>");

  act(() => root.unmount());
});
