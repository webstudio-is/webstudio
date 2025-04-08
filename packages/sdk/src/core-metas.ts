import {
  ContentBlockIcon,
  ListViewIcon,
  PaintBrushIcon,
  SettingsIcon,
  AddTemplateInstanceIcon,
  HtmlElementIcon,
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

export const elementComponent = "ws:element";

const elementMeta: WsComponentMeta = {
  type: "container",
  label: "Element",
  icon: HtmlElementIcon,
};

const elementPropsMeta: WsComponentPropsMeta = {
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
  contentModel: {
    category: "none",
    children: ["empty"],
  },
  // @todo infer possible presets
  presetStyle: {},
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
  contentModel: {
    category: "none",
    children: ["instance"],
  },
};

const blockTemplatePropsMeta: WsComponentPropsMeta = {
  props: {},
};

const blockMeta: WsComponentMeta = {
  type: "container",
  label: "Content Block",
  icon: ContentBlockIcon,
  contentModel: {
    category: "instance",
    children: [blockTemplateComponent, "instance"],
    // @todo prevent deleting block template
  },
};

const blockPropsMeta: WsComponentPropsMeta = {
  props: {},
};

export const coreMetas = {
  [rootComponent]: rootMeta,
  [elementComponent]: elementMeta,
  [collectionComponent]: collectionMeta,
  [descendantComponent]: descendantMeta,
  [blockComponent]: blockMeta,
  [blockTemplateComponent]: blockTemplateMeta,
};

export const corePropsMetas = {
  [rootComponent]: rootPropsMeta,
  [elementComponent]: elementPropsMeta,
  [collectionComponent]: collectionPropsMeta,
  [descendantComponent]: descendantPropsMeta,
  [blockComponent]: blockPropsMeta,
  [blockTemplateComponent]: blockTemplatePropsMeta,
};

// components with custom implementation
// should not be imported as react component
export const isCoreComponent = (component: string) =>
  component === rootComponent ||
  component === elementComponent ||
  component === collectionComponent ||
  component === descendantComponent ||
  component === blockComponent ||
  component === blockTemplateComponent;
