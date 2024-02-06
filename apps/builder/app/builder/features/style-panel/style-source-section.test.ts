import { enableMapSet } from "immer";
import { expect, test } from "@jest/globals";
import type { Breakpoint } from "@webstudio-is/sdk";
import type { WsComponentMeta } from "@webstudio-is/react-sdk";
import { registerContainers } from "~/shared/sync";
import {
  $breakpoints,
  $registeredComponentMetas,
  $selectedInstanceSelector,
  $selectedStyleSources,
  $styleSourceSelections,
  $styleSources,
} from "~/shared/nano-states";
import {
  $presetTokens,
  addStyleSourceToInstance,
} from "./style-source-section";

enableMapSet();
registerContainers();

test("generate styles from preset tokens", () => {
  $breakpoints.set(
    new Map<Breakpoint["id"], Breakpoint>([
      ["base", { id: "base", label: "Base" }],
    ])
  );
  $registeredComponentMetas.set(
    new Map<string, WsComponentMeta>([
      [
        "Box",
        {
          icon: "",
          type: "container",
          presetTokens: {
            boxBright: {
              styles: [
                {
                  property: "color",
                  value: { type: "keyword", value: "black" },
                },
              ],
            },
          },
        },
      ],
      [
        "Button",
        {
          icon: "",
          type: "container",
          presetTokens: {
            buttonPrimary: {
              styles: [
                {
                  property: "backgroundColor",
                  value: { type: "keyword", value: "black" },
                },
              ],
            },
          },
        },
      ],
    ])
  );
  expect($presetTokens.get()).toEqual(
    new Map([
      [
        "Box:boxBright",
        {
          component: "Box",
          styleSource: {
            type: "token",
            id: "Box:boxBright",
            name: "Box Bright",
          },
          styles: [
            {
              breakpointId: "base",
              styleSourceId: "Box:boxBright",
              property: "color",
              value: { type: "keyword", value: "black" },
            },
          ],
        },
      ],
      [
        "Button:buttonPrimary",
        {
          component: "Button",
          styleSource: {
            type: "token",
            id: "Button:buttonPrimary",
            name: "Button Primary",
          },
          styles: [
            {
              breakpointId: "base",
              styleSourceId: "Button:buttonPrimary",
              property: "backgroundColor",
              value: { type: "keyword", value: "black" },
            },
          ],
        },
      ],
    ])
  );
});

test("add style source to instance", () => {
  $selectedInstanceSelector.set(["root"]);
  $styleSources.set(new Map([["local1", { id: "local1", type: "local" }]]));
  $styleSourceSelections.set(new Map());
  $selectedStyleSources.set(new Map());

  addStyleSourceToInstance("token1");
  expect($styleSourceSelections.get().get("root")).toEqual({
    instanceId: "root",
    values: ["token1"],
  });
  expect($selectedStyleSources.get().get("root")).toEqual("token1");

  // put new style source last
  addStyleSourceToInstance("local1");
  expect($styleSourceSelections.get().get("root")).toEqual({
    instanceId: "root",
    values: ["token1", "local1"],
  });

  // put new token before local
  addStyleSourceToInstance("token2");
  expect($styleSourceSelections.get().get("root")).toEqual({
    instanceId: "root",
    values: ["token1", "token2", "local1"],
  });
});
