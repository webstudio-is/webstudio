import { useState } from "react";
import { nanoid } from "nanoid";
import type { Instance, Prop } from "@webstudio-is/project-build";
import {
  type WsComponentPropsMeta,
  showAttribute,
} from "@webstudio-is/react-sdk";
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
      return { type: "string", control: "file", required: false };
    case "page":
      return { type: "string", control: "url", required: false };
    case "string[]":
      throw new Error(
        "A prop with type string[] must have a meta, we can't provide a default one because we need a list of options"
      );
    default:
      throw new Error(`Usupported data type: ${type satisfies never}`);
  }
};

type UsePropsLogicInput = {
  props: Prop[];
  meta: WsComponentPropsMeta;
  instanceId: Instance["id"];
  updateProp: (update: Prop) => void;
  deleteProp: (id: Prop["id"]) => void;
};

type UsePropsLogicOutput = {
  /** Similar to Initial, but displayed as a separate group in UI etc.
   * Currentrly used only for the ID prop. */
  systemProps: PropAndMeta[];
  /** Initial (not deletable) props */
  initialProps: PropAndMeta[];
  /** Optional props that were added by user */
  addedProps: PropAndMeta[];
  /** List of remaining props still available to add */
  remainingProps: NameAndLabel[];
  handleAdd: (propName: string) => void;
  handleChange: (prop: PropOrName, value: PropValue) => void;
  handleDelete: (prop: PropOrName) => void;
  /** Delete the prop, but keep it in the list of added props */
  handleSoftDelete: (prop: Prop) => void;
};

const getAndDelete = <Value>(map: Map<string, Value>, key: string) => {
  const value = map.get(key);
  map.delete(key);
  return value;
};

const systemPropsMeta: { name: string; meta: PropMeta }[] = [
  {
    name: "id",
    meta: {
      label: "ID",
      required: false,
      control: "text",
      type: "string",
    },
  },
  {
    name: showAttribute,
    meta: {
      label: "Show",
      required: false,
      defaultValue: true,
      control: "boolean",
      type: "boolean",
    },
  },
];

/** usePropsLogic expects that key={instanceId} is used on the ancestor component */
export const usePropsLogic = ({
  props: savedProps,
  meta,
  instanceId,
  updateProp,
  deleteProp,
}: UsePropsLogicInput): UsePropsLogicOutput => {
  // we will delete items from these maps as we categorize the props
  const unprocessedSaved = new Map(savedProps.map((prop) => [prop.name, prop]));
  const unprocessedKnown = new Map(Object.entries(meta.props));

  const initialPropsNames = new Set(meta.initialProps ?? []);

  const systemProps = systemPropsMeta.map(({ name, meta }) => {
    let saved = getAndDelete(unprocessedSaved, name);
    if (saved === undefined && meta.defaultValue !== undefined) {
      saved = getStartingProp(instanceId, meta, name);
    }
    getAndDelete(unprocessedKnown, name);
    initialPropsNames.delete(name);
    return { prop: saved, propName: name, meta };
  });

  const initialProps: PropAndMeta[] = Array.from(initialPropsNames, (name) => {
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
      prop = getStartingProp(instanceId, known, name);
    }

    return { prop, propName: name, meta: known };
  });

  // We keep track of names because sometime prop is in the list but not actually added/saved
  // Also makes order stable etc.
  const [addedNames, setAddedNames] = useState<Prop["name"][]>(() =>
    Array.from(unprocessedSaved.values(), (prop) => prop.name)
  );

  const addedProps: PropAndMeta[] = addedNames.map((name) => {
    const saved = getAndDelete(unprocessedSaved, name);
    const known = getAndDelete(unprocessedKnown, name);

    // @todo:
    //   if meta is undefined, this means it's a "custom attribute"
    //   but because custom attributes not implemented yet,
    //   we'll show it as a regular optional prop for now
    if (known === undefined) {
      if (saved === undefined) {
        throw new Error(`Cannot find meta for a newly added prop "${name}`);
      }
      return {
        prop: saved,
        propName: name,
        meta: getDefaultMetaForType(saved.type),
      };
    }

    return { prop: saved, propName: name, meta: known };
  });

  const handleAdd = (propName: string) => {
    const propMeta = unprocessedKnown.get(propName);
    if (propMeta === undefined) {
      throw new Error(`Attempting to add a prop not lised in remainingProps`);
    }
    const prop = getStartingProp(instanceId, propMeta, propName);
    if (prop) {
      updateProp(prop);
    }
    setAddedNames((prev) => [...prev, propName]);
  };

  const handleChange = ({ prop, propName }: PropOrName, value: PropValue) => {
    updateProp(
      prop === undefined
        ? { id: nanoid(), instanceId, name: propName, ...value }
        : { ...prop, ...value }
    );
  };

  const handleDelete = ({ prop, propName }: PropOrName) => {
    if (prop) {
      deleteProp(prop.id);
    }
    setAddedNames((prev) => prev.filter((name) => propName !== name));
  };

  const handleSoftDelete = (prop: Prop) => {
    deleteProp(prop.id);
  };

  return {
    systemProps,
    initialProps,
    addedProps,
    remainingProps: Array.from(
      unprocessedKnown.entries(),
      ([name, { label }]) => ({ name, label })
    ),
    handleAdd,
    handleChange,
    handleDelete,
    handleSoftDelete,
  };
};
