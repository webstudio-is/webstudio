import { expect, test } from "vitest";
import type {
  Instance,
  Prop,
  WebstudioFragment,
  WsComponentMeta,
} from "@webstudio-is/sdk";
import { isFragmentContentModeCopyableProp } from "./content-mode-copy-policy";

test("checks whether fragment props are copyable in content mode", () => {
  const prop: Prop = {
    id: "prop-alt",
    instanceId: "image",
    name: "alt",
    type: "string",
    value: "Logo",
  };
  const instance: Instance = {
    type: "instance",
    id: "image",
    component: "Image",
    children: [],
  };
  const fragment: WebstudioFragment = {
    children: [{ type: "id", value: "image" }],
    instances: [instance],
    props: [prop],
    assets: [],
    dataSources: [],
    resources: [],
    breakpoints: [],
    styleSourceSelections: [],
    styleSources: [],
    styles: [],
  };
  const metas = new Map<string, WsComponentMeta>([
    [
      "Image",
      {
        label: "Image",
        props: {
          alt: {
            type: "string",
            control: "text",
            required: false,
            contentMode: true,
          },
        },
      },
    ],
  ]);

  expect(
    isFragmentContentModeCopyableProp({
      prop,
      fragment,
      fragmentInstances: new Map([["image", instance]]),
      styleSources: new Map(),
      metas,
    })
  ).toBe(true);

  expect(
    isFragmentContentModeCopyableProp({
      prop: { ...prop, id: "prop-expression", type: "expression", value: "x" },
      fragment: {
        ...fragment,
        props: [
          { ...prop, id: "prop-expression", type: "expression", value: "x" },
        ],
      },
      fragmentInstances: new Map([["image", instance]]),
      styleSources: new Map(),
      metas,
    })
  ).toBe(false);
});
