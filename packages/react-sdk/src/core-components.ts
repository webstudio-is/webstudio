import { ListIcon } from "@webstudio-is/icons/svg";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import type {
  WsComponentMeta,
  WsComponentPropsMeta,
} from "./components/component-meta";

export const portalComponent = "Slot";

export const collectionComponent = "ws:collection";

const collectionMeta: WsComponentMeta = {
  category: isFeatureEnabled("bindings") ? "general" : "hidden",
  order: 7,
  type: "container",
  label: "Collection",
  icon: ListIcon,
  template: [
    {
      type: "instance",
      component: collectionComponent,
      variables: {
        collectionItem: { initialValue: "" },
      },
      props: [
        {
          name: "data",
          type: "json",
          value: ["apple", "orange", "banana"],
        },
        { name: "item", type: "parameter", variableName: "collectionItem" },
      ],
      children: [
        {
          type: "instance",
          component: "Box",
          children: [
            {
              type: "instance",
              component: "HtmlEmbed",
              props: [
                { name: "code", type: "expression", code: "collectionItem" },
              ],
              children: [],
            },
          ],
        },
      ],
    },
  ],
};

const collectionPropsMeta: WsComponentPropsMeta = {
  props: {
    data: {
      required: true,
      control: "json",
      type: "json",
    },
  },
  initialProps: ["data"],
};

export const coreMetas = {
  [collectionComponent]: collectionMeta,
};

export const corePropsMetas = {
  [collectionComponent]: collectionPropsMeta,
};
