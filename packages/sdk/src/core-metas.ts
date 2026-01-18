import {
  ContentBlockIcon,
  ListViewIcon,
  PaintBrushIcon,
  SettingsIcon,
  AddTemplateInstanceIcon,
} from "@webstudio-is/icons/svg";
import { html } from "./__generated__/normalize.css";
import * as normalize from "./__generated__/normalize.css";
import type { WsComponentMeta } from "./schema/component-meta";
import type { Instance } from "./schema/instances";
import { tagProperty } from "./runtime";
import { tags } from "./__generated__/tags";

export const rootComponent = "ws:root";

const rootMeta: WsComponentMeta = {
  label: "Global Root",
  icon: SettingsIcon,
  presetStyle: {
    html,
  },
};

export const elementComponent = "ws:element";

const elementMeta: WsComponentMeta = {
  label: "Element",
  // convert [object Module] to [object Object] to enable structured cloning
  presetStyle: { ...normalize },
  initialProps: [tagProperty, "id", "class"],
  props: {
    [tagProperty]: {
      type: "string",
      control: "tag",
      required: true,
      options: tags,
    },
  },
};

export const portalComponent = "Slot";

export const collectionComponent = "ws:collection";

const collectionMeta: WsComponentMeta = {
  label: "Collection",
  icon: ListViewIcon,
  contentModel: {
    category: "instance",
    children: ["instance"],
  },
  initialProps: ["data"],
  props: {
    data: {
      required: true,
      control: "json",
      type: "json",
    },
    item: {
      required: false,
      control: "text",
      type: "string",
    },
    itemKey: {
      required: false,
      control: "text",
      type: "string",
    },
  },
};

export const descendantComponent = "ws:descendant";

const descendantMeta: WsComponentMeta = {
  label: "Descendant",
  icon: PaintBrushIcon,
  contentModel: {
    category: "none",
    children: [],
  },
  // @todo infer possible presets
  presetStyle: {},
  initialProps: ["selector"],
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
};

export const blockComponent = "ws:block";

export const blockTemplateComponent = "ws:block-template";

export const blockTemplateMeta: WsComponentMeta = {
  icon: AddTemplateInstanceIcon,
  contentModel: {
    category: "none",
    children: ["instance"],
  },
};

const blockMeta: WsComponentMeta = {
  label: "Content Block",
  icon: ContentBlockIcon,
  contentModel: {
    category: "instance",
    children: [blockTemplateComponent, "instance"],
  },
};

export const coreMetas = {
  [rootComponent]: rootMeta,
  [elementComponent]: elementMeta,
  [collectionComponent]: collectionMeta,
  [descendantComponent]: descendantMeta,
  [blockComponent]: blockMeta,
  [blockTemplateComponent]: blockTemplateMeta,
};

// components with custom implementation
// should not be imported as react component
export const isCoreComponent = (component: Instance["component"]) =>
  component === rootComponent ||
  component === elementComponent ||
  component === collectionComponent ||
  component === descendantComponent ||
  component === blockComponent ||
  component === blockTemplateComponent;

export const isComponentDetachable = (component: Instance["component"]) =>
  component !== rootComponent &&
  component !== blockTemplateComponent &&
  component !== descendantComponent;
