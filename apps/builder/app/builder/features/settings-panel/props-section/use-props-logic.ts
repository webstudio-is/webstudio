import { nanoid } from "nanoid";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import type { PropMeta, Instance, Prop } from "@webstudio-is/sdk";
import { descendantComponent } from "@webstudio-is/sdk";
import {
  reactPropsToStandardAttributes,
  showAttribute,
  standardAttributesToReactProps,
  textContentAttribute,
} from "@webstudio-is/react-sdk";
import {
  $instances,
  $isContentMode,
  $props,
  $registeredComponentMetas,
} from "~/shared/nano-states";
import { isRichText } from "~/shared/content-model";
import { $selectedInstancePath } from "~/shared/awareness";
import {
  $selectedInstanceInitialPropNames,
  $selectedInstancePropsMetas,
  showAttributeMeta,
  type PropValue,
} from "../shared";

type PropOrName = { prop?: Prop; propName: string };

export type PropAndMeta = {
  prop?: Prop;
  propName: string;
  meta: PropMeta;
};

// The value we set prop to when it's added
//
// If undefined is returned,
// we will not add a prop in storage until we get an onChange from control.
//
// User may have this experience:
//   - they added a prop but didn't touch the control
//   - they closed props panel
//   - when they open props panel again, the prop is not there
//
// We want to avoid this if possible, but for some types like "asset" we can't
export const getStartingValue = (meta: PropMeta): PropValue | undefined => {
  if (meta.type === "string" && meta.control !== "file") {
    return {
      type: "string",
      value: meta.defaultValue ?? "",
    };
  }

  if (meta.type === "number") {
    return {
      type: "number",
      value: meta.defaultValue ?? 0,
    };
  }

  if (meta.type === "boolean") {
    return {
      type: "boolean",
      value: meta.defaultValue ?? false,
    };
  }

  if (meta.type === "string[]") {
    return {
      type: "string[]",
      value: meta.defaultValue ?? [],
    };
  }

  if (meta.type === "action") {
    return {
      type: "action",
      value: [],
    };
  }
};

const getStartingProp = (
  instanceId: Instance["id"],
  meta: PropMeta,
  name: string
): Prop | undefined => {
  const value = getStartingValue(meta);
  return value && { id: nanoid(), instanceId, name, ...value };
};

const getDefaultMetaForType = (type: Prop["type"]): PropMeta => {
  switch (type) {
    case "action":
      return { type: "action", control: "action", required: false };
    case "string":
      return { type: "string", control: "text", required: false };
    case "number":
      return { type: "number", control: "number", required: false };
    case "boolean":
      return { type: "boolean", control: "boolean", required: false };
    case "asset":
      return { type: "string", control: "file", required: false };
    case "page":
      return { type: "string", control: "url", required: false };
    case "string[]":
      throw new Error(
        "A prop with type string[] must have a meta, we can't provide a default one because we need a list of options"
      );

    case "animationAction":
      return {
        type: "animationAction",
        control: "animationAction",
        required: false,
      };
    case "json":
      throw new Error(
        "A prop with type json must have a meta, we can't provide a default one because we need a list of options"
      );
    case "expression":
      throw new Error(
        "A prop with type expression must have a meta, we can't provide a default one because we need a list of options"
      );
    case "parameter":
      throw new Error(
        "A prop with type parameter must have a meta, we can't provide a default one because we need a list of options"
      );
    case "resource":
      throw new Error(
        "A prop with type resource must have a meta, we can't provide a default one because we need a list of options"
      );
    default:
      throw new Error(`Usupported data type: ${type satisfies never}`);
  }
};

type UsePropsLogicInput = {
  instance: Instance;
  props: Prop[];
  updateProp: (update: Prop) => void;
};

const getAndDelete = <Value>(map: Map<string, Value>, key: string) => {
  const value = map.get(key);
  map.delete(key);
  return value;
};

const $canHaveTextContent = computed(
  [$instances, $props, $registeredComponentMetas, $selectedInstancePath],
  (instances, props, metas, instancePath) => {
    if (instancePath === undefined) {
      return false;
    }
    const [{ instanceSelector }] = instancePath;
    return isRichText({
      instances,
      props,
      metas,
      instanceSelector,
    });
  }
);

/** usePropsLogic expects that key={instanceId} is used on the ancestor component */
export const usePropsLogic = ({
  instance,
  props,
  updateProp,
}: UsePropsLogicInput) => {
  const isContentMode = useStore($isContentMode);

  /**
   * In content edit mode we show only Image and Link props
   * In the future I hope the only thing we will show will be Components
   */
  const isPropVisible = (propName: string) => {
    const contentModeWhiteList: Partial<Record<string, string[]>> = {
      Image: ["src", "width", "height", "alt"],
      Link: ["href"],
      RichTextLink: ["href"],
    };

    if (!isContentMode) {
      return true;
    }

    const propsWhiteList = contentModeWhiteList[instance.component] ?? [];

    return propsWhiteList.includes(propName);
  };

  const savedProps = props;

  // we will delete items from these maps as we categorize the props
  const unprocessedSaved = new Map(savedProps.map((prop) => [prop.name, prop]));

  const propsMetas = useStore($selectedInstancePropsMetas);

  const initialPropNames = useStore($selectedInstanceInitialPropNames);

  const systemProps: PropAndMeta[] = [];
  // descendant component is not actually rendered
  // but affects styling of nested elements
  // hiding descendant does not hide nested elements and confuse users
  if (instance.component !== descendantComponent) {
    systemProps.push({
      propName: showAttribute,
      prop: getAndDelete(unprocessedSaved, showAttribute),
      meta: showAttributeMeta,
    });
  }

  const canHaveTextContent = useStore($canHaveTextContent);

  const hasNoChildren = instance.children.length === 0;
  const hasOnlyTextChild =
    instance.children.length === 1 && instance.children[0].type === "text";
  const hasOnlyExpressionChild =
    instance.children.length === 1 &&
    instance.children[0].type === "expression";
  if (
    canHaveTextContent &&
    (hasNoChildren || hasOnlyTextChild || hasOnlyExpressionChild)
  ) {
    systemProps.push({
      propName: textContentAttribute,
      meta: {
        required: false,
        control: "textContent",
        type: "string",
      },
    });
  }

  const initialProps: PropAndMeta[] = [];
  for (const name of initialPropNames) {
    const propMeta = propsMetas.get(name);

    if (propMeta === undefined) {
      console.error(
        `The prop "${name}" is defined in meta.initialProps but not in meta.props`
      );
      continue;
    }

    let prop =
      getAndDelete<Prop>(unprocessedSaved, name) ??
      // support legacy html props stored with react names
      getAndDelete<Prop>(
        unprocessedSaved,
        standardAttributesToReactProps[name]
      );
    if (prop) {
      prop = { ...prop, name };
    }

    // For initial props, if prop is not saved, we want to show default value if available.
    //
    // Important to not use getStartingProp if default is not available
    // beacuse user may have this experience:
    //   - they open props panel of an Image
    //   - they see 0 in the control for "width"
    //   - where 0 is a fallback when no default is available
    //   - they think that width is set to 0, but it's actually not set at all
    //
    if (prop === undefined && propMeta.defaultValue !== undefined) {
      prop = getStartingProp(instance.id, propMeta, name);
    }

    initialProps.push({
      prop,
      propName: name,
      meta: propMeta,
    });
  }

  const addedProps: PropAndMeta[] = [];
  for (let prop of Array.from(unprocessedSaved.values()).reverse()) {
    // ignore parameter props
    if (prop.type === "parameter") {
      continue;
    }
    let name = prop.name;
    let propMeta = propsMetas.get(name);
    // support legacy html props stored with react names
    if (propsMetas.has(reactPropsToStandardAttributes[name])) {
      name = reactPropsToStandardAttributes[name];
      propMeta = propsMetas.get(name);
    }
    prop = { ...prop, name };
    propMeta ??= getDefaultMetaForType("string");

    addedProps.push({
      prop,
      propName: prop.name,
      meta: propMeta,
    });
  }

  const handleAdd = (propName: string) => {
    // In case of custom property/attribute we get a string.
    const propMeta =
      propsMetas.get(propName) ?? getDefaultMetaForType("string");
    const prop = getStartingProp(instance.id, propMeta, propName);
    if (prop) {
      updateProp(prop);
    }
  };

  const handleChange = ({ prop, propName }: PropOrName, value: PropValue) => {
    updateProp(
      prop === undefined
        ? { id: nanoid(), instanceId: instance.id, name: propName, ...value }
        : { ...prop, ...value }
    );
  };

  const handleChangeByPropName = (propName: string, value: PropValue) => {
    const prop = props.find((prop) => prop.name === propName);

    updateProp(
      prop === undefined
        ? { id: nanoid(), instanceId: instance.id, name: propName, ...value }
        : { ...prop, ...value }
    );
  };

  return {
    handleAdd,
    handleChange,
    handleChangeByPropName,
    /** Similar to Initial, but displayed as a separate group in UI etc.
     * Currentrly used only for the ID prop. */
    systemProps: systemProps.filter(({ propName }) => isPropVisible(propName)),
    /** Initial (not deletable) props */
    initialProps: initialProps.filter(({ propName }) =>
      isPropVisible(propName)
    ),
    /** Optional props that were added by user */
    addedProps: addedProps.filter(({ propName }) => isPropVisible(propName)),
  };
};
