import {
  ContentBlockIcon,
  ListViewIcon,
  PaintBrushIcon,
  SettingsIcon,
  AddTemplateInstanceIcon,
} from "@webstudio-is/icons/svg";
import { html } from "./__generated__/normalize.css";
import type {
  WsComponentMeta,
  WsComponentPropsMeta,
} from "./schema/component-meta";

export const rootComponent = "ws:root";

const rootMeta: WsComponentMeta = {
  type: "container",
  label: "Global Root",
  icon: SettingsIcon,
  presetStyle: {
    html,
  },
};

const rootPropsMeta: WsComponentPropsMeta = {
  props: {},
};

export const portalComponent = "Slot";

export const collectionComponent = "ws:collection";

const collectionMeta: WsComponentMeta = {
  type: "container",
  label: "Collection",
  icon: ListViewIcon,
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

export const descendantComponent = "ws:descendant";

const descendantMeta: WsComponentMeta = {
  type: "control",
  label: "Descendant",
  icon: PaintBrushIcon,
  // @todo infer possible presets
  presetStyle: {},
  constraints: {
    relation: "parent",
    component: { $in: ["HtmlEmbed", "MarkdownEmbed"] },
  },
};

const descendantPropsMeta: WsComponentPropsMeta = {
  props: {
    selector: {
      required: true,
      type: "string",
      control: "select",
      options: [
        " p",
        " h1",
        " h2",
        " h3",
        " h4",
        " h5",
        " h6",
        " :where(strong, b)",
        " :where(em, i)",
        " a",
        " img",
        " blockquote",
        " code",
        " :where(ul, ol)",
        " li",
        " hr",
      ],
    },
  },
  initialProps: ["selector"],
};

export const blockComponent = "ws:block";

export const blockTemplateComponent = "ws:block-template";

export const blockTemplateMeta: WsComponentMeta = {
  type: "container",
  icon: AddTemplateInstanceIcon,
  constraints: {
    relation: "parent",
    component: { $eq: blockComponent },
  },
};

const blockTemplatePropsMeta: WsComponentPropsMeta = {
  props: {},
};

const blockMeta: WsComponentMeta = {
  type: "container",
  label: "Content Block",
  icon: ContentBlockIcon,
  constraints: [
    {
      relation: "ancestor",
      component: { $nin: [collectionComponent, blockComponent] },
    },
    {
      relation: "child",
      component: { $eq: blockTemplateComponent },
    },
  ],
};

const blockPropsMeta: WsComponentPropsMeta = {
  props: {},
};

export const coreMetas = {
  [rootComponent]: rootMeta,
  [collectionComponent]: collectionMeta,
  [descendantComponent]: descendantMeta,
  [blockComponent]: blockMeta,
  [blockTemplateComponent]: blockTemplateMeta,
};

export const corePropsMetas = {
  [rootComponent]: rootPropsMeta,
  [collectionComponent]: collectionPropsMeta,
  [descendantComponent]: descendantPropsMeta,
  [blockComponent]: blockPropsMeta,
  [blockTemplateComponent]: blockTemplatePropsMeta,
};

// components with custom implementation
// should not be imported as react component
export const isCoreComponent = (component: string) =>
  component === rootComponent ||
  component === collectionComponent ||
  component === descendantComponent ||
  component === blockComponent ||
  component === blockTemplateComponent;
