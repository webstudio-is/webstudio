import { nanoid } from "nanoid";
import { useStore } from "@nanostores/react";
import type { PropMeta, Instance, Prop } from "@webstudio-is/sdk";
import { collectionComponent, descendantComponent } from "@webstudio-is/sdk";
import { showAttribute, textContentAttribute } from "@webstudio-is/react-sdk";
import type { PropValue } from "../shared";
import {
  $isContentMode,
  $registeredComponentMetas,
  $registeredComponentPropsMetas,
} from "~/shared/nano-states";

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
  deleteProp: (id: Prop["id"]) => void;
};

const getAndDelete = <Value>(map: Map<string, Value>, key: string) => {
  const value = map.get(key);
  map.delete(key);
  return value;
};

const systemPropsMeta: { name: string; meta: PropMeta }[] = [
  {
    name: showAttribute,
    meta: {
      label: "Show",
      required: false,
      control: "boolean",
      type: "boolean",
      defaultValue: true,
      // If you are changing it, change the other one too
      description:
        "Removes the instance from the DOM. Breakpoints have no effect on this setting.",
    },
  },
];

/** usePropsLogic expects that key={instanceId} is used on the ancestor component */
export const usePropsLogic = ({
  instance,
  props,
  updateProp,
  deleteProp,
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

  const instanceMeta = useStore($registeredComponentMetas).get(
    instance.component
  );
  const meta = useStore($registeredComponentPropsMetas).get(
    instance.component
  ) ?? {
    props: {},
    initialProps: [],
  };

  const savedProps = props;

  // we will delete items from these maps as we categorize the props
  const unprocessedSaved = new Map(savedProps.map((prop) => [prop.name, prop]));
  const unprocessedKnown = new Map<Prop["name"], PropMeta>(
    Object.entries(meta.props)
  );

  const initialPropsNames = new Set(meta.initialProps ?? []);

  const systemProps: PropAndMeta[] = systemPropsMeta
    .filter(({ name }) => {
      // descendant component is not actually rendered
      // but affects styling of nested elements
      // hiding descendant does not hide nested elements and confuse users
      if (
        instance.component === descendantComponent &&
        name === showAttribute
      ) {
        return false;
      }
      return true;
    })
    .map(({ name, meta }) => {
      let saved = getAndDelete<Prop>(unprocessedSaved, name);
      if (saved === undefined && meta.defaultValue !== undefined) {
        saved = getStartingProp(instance.id, meta, name);
      }
      getAndDelete(unprocessedKnown, name);
      initialPropsNames.delete(name);
      return {
        prop: saved,
        propName: name,
        meta,
      };
    });

  const canHaveTextContent =
    instanceMeta?.type === "container" &&
    instance.component !== collectionComponent;

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
        label: "Text Content",
        required: false,
        control: "textContent",
        type: "string",
        defaultValue: "",
      },
    });
  }

  const initialProps: PropAndMeta[] = [];
  for (const name of initialPropsNames) {
    const saved = getAndDelete<Prop>(unprocessedSaved, name);
    const known = getAndDelete(unprocessedKnown, name);

    if (known === undefined) {
      console.error(
        `The prop "${name}" is defined in meta.initialProps but not in meta.props`
      );
      continue;
    }

    let prop = saved;

    // For initial props, if prop is not saved, we want to show default value if available.
    //
    // Important to not use getStartingProp if default is not available
    // beacuse user may have this experience:
    //   - they open props panel of an Image
    //   - they see 0 in the control for "width"
    //   - where 0 is a fallback when no default is available
    //   - they think that width is set to 0, but it's actually not set at all
    //
    if (prop === undefined && known.defaultValue !== undefined) {
      prop = getStartingProp(instance.id, known, name);
    }

    initialProps.push({
      prop,
      propName: name,
      meta: known,
    });
  }

  const addedProps: PropAndMeta[] = [];
  for (const prop of Array.from(unprocessedSaved.values()).reverse()) {
    // ignore parameter props
    if (prop.type === "parameter") {
      continue;
    }

    const meta =
      getAndDelete(unprocessedKnown, prop.name) ??
      getDefaultMetaForType("string");

    addedProps.push({
      prop,
      propName: prop.name,
      meta,
    });
  }

  const handleAdd = (propName: string) => {
    const propMeta =
      unprocessedKnown.get(propName) ??
      // In case of custom property/attribute we get a string.
      getDefaultMetaForType("string");
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

  const handleDeleteByPropName = (propName: string) => {
    const prop = props.find((prop) => prop.name === propName);

    if (prop) {
      deleteProp(prop.id);
    }
  };

  const handleDelete = (prop: Prop) => {
    deleteProp(prop.id);
  };

  return {
    handleAdd,
    handleChange,
    handleDelete,
    handleChangeByPropName,
    handleDeleteByPropName,
    meta,
    /** Similar to Initial, but displayed as a separate group in UI etc.
     * Currentrly used only for the ID prop. */
    systemProps: systemProps.filter(({ propName }) => isPropVisible(propName)),
    /** Initial (not deletable) props */
    initialProps: initialProps.filter(({ propName }) =>
      isPropVisible(propName)
    ),
    /** Optional props that were added by user */
    addedProps: addedProps.filter(({ propName }) => isPropVisible(propName)),
    /** List of remaining props still available to add */
    availableProps: Array.from(
      unprocessedKnown.entries(),
      ([name, { label, description }]) => ({ name, label, description })
    ),
  };
};
