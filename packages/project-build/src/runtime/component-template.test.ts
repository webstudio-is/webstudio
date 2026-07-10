import { expect, test } from "vitest";
import type { WebstudioFragment } from "@webstudio-is/sdk";
import { createComponentTemplateFragment } from "./component-template";

const template: WebstudioFragment = {
  children: [{ type: "id", value: "switch-root" }],
  instances: [
    {
      type: "instance",
      id: "switch-root",
      component: "@webstudio-is/sdk-components-react-radix:Switch",
      children: [{ type: "id", value: "switch-thumb" }],
    },
    {
      type: "instance",
      id: "switch-thumb",
      component: "@webstudio-is/sdk-components-react-radix:SwitchThumb",
      children: [],
    },
  ],
  props: [],
  dataSources: [],
  styleSourceSelections: [],
  styleSources: [],
  styles: [],
  breakpoints: [],
  assets: [],
  resources: [],
};

test("returns registered component template", () => {
  expect(
    createComponentTemplateFragment({
      component: "@webstudio-is/sdk-components-react-radix:Switch",
      templates: new Map([
        [
          "@webstudio-is/sdk-components-react-radix:Switch",
          {
            template,
          },
        ],
      ]),
      createId: () => "unused",
    })
  ).toBe(template);
});

test("creates single-instance fallback for components without templates", () => {
  const fragment = createComponentTemplateFragment({
    component: "Box",
    templates: new Map(),
    createId: () => "box-id",
  });

  expect(fragment).toEqual({
    children: [{ type: "id", value: "box-id" }],
    instances: [
      {
        type: "instance",
        id: "box-id",
        component: "Box",
        children: [],
      },
    ],
    props: [],
    dataSources: [],
    styleSourceSelections: [],
    styleSources: [],
    styles: [],
    breakpoints: [],
    assets: [],
    resources: [],
  });
});
