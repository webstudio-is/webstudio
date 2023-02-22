import { useState } from "react";
import { nanoid } from "nanoid";
import type { Instance, Prop } from "@webstudio-is/project-build";
import { getComponentPropsMeta } from "@webstudio-is/react-sdk";
import type { PropMeta, PropValue } from "./shared";

type PropOrName = { prop?: Prop; propName: string };
export type PropAndMeta = { prop?: Prop; propName: string; meta: PropMeta };
export type NameAndLabel = { name: string; label?: string };

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
  if (meta.type === "string" && meta.control !== "file-image") {
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
    case "string":
      return { type: "string", control: "text", required: false };
    case "number":
      return { type: "number", control: "number", required: false };
    case "boolean":
      return { type: "boolean", control: "boolean", required: false };
    case "asset":
      return { type: "string", control: "file-image", required: false };
    case "string[]":
      throw new Error(
        "A prop with type string[] must have a meta, we can't provide a default one because we need a list of options"
      );
    default:
      throw new Error(`Usupported data type: ${type}`);
  }
};

type UsePropsLogicInput = {
  props: Prop[];
  instance: Instance;
  updateProp: (update: Prop) => void;
  deleteProp: (id: Prop["id"]) => void;
};

type UsePropsLogicOutput = {
  /**
   * Initial (not deletable) props
   */
  initialProps: PropAndMeta[];
  /**
   * Optional props that were added by user
   */
  addedProps: PropAndMeta[];
  /**
   * List of remaining props still available to add
   */
  remainingProps: NameAndLabel[];
  handleAdd: (propName: string) => void;
  handleChange: (prop: PropOrName, value: PropValue) => void;
  handleDelete: (prop: PropOrName) => void;
};

const getAndDelete = <Value>(map: Map<string, Value>, key: string) => {
  const value = map.get(key);
  map.delete(key);
  return value;
};

/**
 * usePropsLogic expects that key={instance.id} is used on the ancestor component
 */
export const usePropsLogic = ({
  props: savedProps,
  instance,
  updateProp,
  deleteProp,
}: UsePropsLogicInput): UsePropsLogicOutput => {
  const meta = getComponentPropsMeta(instance.component);
  if (meta === undefined) {
    throw new Error(`Could not get meta for compoent "${instance.component}"`);
  }

  // we will delete items from these maps as we categorize the props
  const unprocessedSaved = new Map(savedProps.map((prop) => [prop.name, prop]));
  const unprocessedKnown = new Map(Object.entries(meta.props));

  const initialProps: PropAndMeta[] = (meta.initialProps ?? []).map((name) => {
    const saved = getAndDelete(unprocessedSaved, name);
    const known = getAndDelete(unprocessedKnown, name);

    if (known === undefined) {
      throw new Error(
        `The prop "${name}" is defined in meta.initialProps but not in meta.props`
      );
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

    return { prop, propName: name, meta: known };
  });

  // names of the props added by the user during the lifetime of the hook
  const [newNames, setNewNames] = useState<Prop["name"][]>([]);

  const oldAdded: PropAndMeta[] = Array.from(unprocessedSaved.values())
    .filter((prop) => newNames.includes(prop.name) === false)
    .map((prop) => {
      const known = getAndDelete(unprocessedKnown, prop.name);
      unprocessedSaved.delete(prop.name);
      return {
        prop,
        propName: prop.name,

        // @todo:
        //   if meta is undefined, this means it's a "custom attribute"
        //   but because custom attributes not implemented yet,
        //   we'll show it as a regular optional prop for now
        meta: known ?? getDefaultMetaForType(prop.type),
      };
    });

  const newAdded: PropAndMeta[] = newNames.map((name) => {
    const saved = getAndDelete(unprocessedSaved, name);
    const known = getAndDelete(unprocessedKnown, name);

    if (known === undefined) {
      throw new Error(`Cannot find meta for a newly added prop "${name}`);
    }

    return { prop: saved, propName: name, meta: known };
  });

  // can happen only if there is a bug
  if (unprocessedSaved.size > 0) {
    throw new Error(
      `Expected all saved props to be processed, but there are ${unprocessedSaved.size} left`
    );
  }

  const handleAdd = (propName: string) => {
    const propMeta = unprocessedKnown.get(propName);
    if (propMeta === undefined) {
      throw new Error(`Attempting to add a prop not lised in remainingProps`);
    }
    const prop = getStartingProp(instance.id, propMeta, propName);
    if (prop) {
      updateProp(prop);
    }
    setNewNames((prev) => [...prev, propName]);
  };

  const handleChange = ({ prop, propName }: PropOrName, value: PropValue) => {
    updateProp(
      prop === undefined
        ? { id: nanoid(), instanceId: instance.id, name: propName, ...value }
        : { ...prop, ...value }
    );
  };

  const handleDelete = ({ prop, propName }: PropOrName) => {
    if (prop) {
      deleteProp(prop.id);
    }
    setNewNames((prev) => prev.filter((name) => propName !== name));
  };

  return {
    initialProps,
    addedProps: [...oldAdded, ...newAdded],
    remainingProps: Array.from(unprocessedKnown.entries()).map(
      ([name, { label }]) => ({ name, label })
    ),
    handleAdd,
    handleChange,
    handleDelete,
  };
};
