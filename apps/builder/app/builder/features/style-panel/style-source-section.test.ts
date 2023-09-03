import { expect, test } from "@jest/globals";
import type { Breakpoint } from "@webstudio-is/sdk";
import type { WsComponentMeta } from "@webstudio-is/react-sdk";
import {
  breakpointsStore,
  registeredComponentMetasStore,
} from "~/shared/nano-states";
import { $presetTokens } from "./style-source-section";

test("generate Styles from preset tokens", () => {
  breakpointsStore.set(
    new Map<Breakpoint["id"], Breakpoint>([
      ["base", { id: "base", label: "Base" }],
    ])
  );
  registeredComponentMetasStore.set(
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
