import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test } from "vitest";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
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
          label: "Heading 1",
          children: [],
        }}
      />
    );
  });
  expect(container.textContent).toContain("Heading 1<Heading>");

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
