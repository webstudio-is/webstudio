import { forwardRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import type { Instance } from "@webstudio-is/sdk";
import type { Components } from "@webstudio-is/react-sdk";
import {
  createInstanceChildrenElements,
  type WebstudioComponentProps,
} from "./elements";

test("renders expression and instance siblings in order", () => {
  const instances = new Map<string, Instance>([
    [
      "child",
      {
        id: "child",
        type: "instance",
        component: "Box",
        children: [],
      },
    ],
  ]);
  const Component = forwardRef<HTMLElement, WebstudioComponentProps>(
    ({ instance }, _ref) => <span>{instance.id}</span>
  );
  const children = createInstanceChildrenElements({
    instances,
    instanceSelector: ["parent"],
    children: [
      {
        type: "expression",
        value: '"Hello " + $ws$dataSource$name',
      },
      { type: "id", value: "child" },
    ],
    Component,
    components: new Map() as Components,
    variableValues: new Map([["name", "world"]]),
  });

  expect(renderToStaticMarkup(<>{children}</>)).toBe(
    "Hello world<span>child</span>"
  );
});
