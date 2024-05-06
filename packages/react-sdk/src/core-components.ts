import { EmbedIcon, ListViewIcon } from "@webstudio-is/icons/svg";
import type {
  WsComponentMeta,
  WsComponentPropsMeta,
} from "./components/component-meta";

export const portalComponent = "Slot";

export const collectionComponent = "ws:collection";

const collectionMeta: WsComponentMeta = {
  category: "data",
  order: 7,
  type: "container",
  label: "Collection",
  icon: ListViewIcon,
  stylable: false,
  template: [
    {
      type: "instance",
      component: collectionComponent,
      props: [
        {
          name: "data",
          type: "json",
          value: [
            "Collection Item 1",
            "Collection Item 2",
            "Collection Item 3",
          ],
        },
        {
          name: "item",
          type: "parameter",
          variableName: "collectionItem",
          variableAlias: "Collection Item",
        },
      ],
      children: [
        {
          type: "instance",
          component: "Box",
          children: [{ type: "expression", value: "collectionItem" }],
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

export const descendentComponent = "ws:descendent";

const descendentMeta: WsComponentMeta = {
  category: "internal",
  type: "control",
  label: "Descendent",
  icon: EmbedIcon,
};

const descendentPropsMeta: WsComponentPropsMeta = {
  props: {
    selector: {
      required: true,
      control: "text",
      type: "string",
    },
  },
  initialProps: ["selector"],
};

export const coreMetas = {
  [collectionComponent]: collectionMeta,
  [descendentComponent]: descendentMeta,
};

export const corePropsMetas = {
  [collectionComponent]: collectionPropsMeta,
  [descendentComponent]: descendentPropsMeta,
};

// components with custom implementation
// should not be imported as react component
export const isCoreComponent = (component: string) =>
  component === collectionComponent || component === descendentComponent;
