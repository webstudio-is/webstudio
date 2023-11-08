import { nanoid } from "nanoid";
import type { Instance, Prop } from "@webstudio-is/sdk";
import { type PropMeta, showAttribute } from "@webstudio-is/react-sdk";
import type { PropValue } from "../shared";
import { useStore } from "@nanostores/react";
import {
  dataSourcesLogicStore,
  dataSourcesStore,
  registeredComponentPropsMetasStore,
} from "~/shared/nano-states";

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
    case "dataSource":
      throw new Error(
        "A prop with type dataSource must have a meta, we can't provide a default one because we need a list of options"
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
      defaultValue: true,
      control: "boolean",
      type: "boolean",
    },
  },
];

const getPropTypeAndValue = (value: unknown) => {
  if (typeof value === "boolean") {
    return { type: "boolean", value } as const;
  }
  if (typeof value === "number") {
    return { type: "number", value } as const;
  }
  if (typeof value === "string") {
    return { type: "string", value } as const;
  }
  if (Array.isArray(value)) {
    return { type: "string[]", value } as const;
  }
  // fallback to empty string to not break UI
  return { type: "string", value: "" } as const;
};

/** usePropsLogic expects that key={instanceId} is used on the ancestor component */
export const usePropsLogic = ({
  instance,
  props,
  updateProp,
  deleteProp,
}: UsePropsLogicInput) => {
  const meta = useStore(registeredComponentPropsMetasStore).get(
    instance.component
  );
  const dataSources = useStore(dataSourcesStore);
  const dataSourcesLogic = useStore(dataSourcesLogicStore);

  if (meta === undefined) {
    throw new Error(`Could not get meta for component "${instance.component}"`);
  }

  const savedProps = props.flatMap((prop) => {
    if (prop.type !== "dataSource") {
      return [prop];
    }
    // convert data source prop to typed prop
    const dataSourceId = prop.value;
    const dataSource = dataSources.get(dataSourceId);
    const dataSourceValue =
      dataSourcesLogic.get(prop.id) ?? dataSourcesLogic.get(dataSourceId);
    if (dataSource === undefined) {
      return [];
    }
    return [
      {
        id: prop.id,
        instanceId: prop.instanceId,
        name: prop.name,
        required: prop.required,
        // infer type from value
        ...getPropTypeAndValue(dataSourceValue),
      } satisfies Prop,
    ];
  });

  // we will delete items from these maps as we categorize the props
  const unprocessedSaved = new Map(savedProps.map((prop) => [prop.name, prop]));
  const unprocessedKnown = new Map<Prop["name"], PropMeta>(
    Object.entries(meta.props)
  );

  const initialPropsNames = new Set(meta.initialProps ?? []);

  const systemProps = systemPropsMeta.map(({ name, meta }) => {
    let saved = getAndDelete<Prop>(unprocessedSaved, name);
    if (saved === undefined && meta.defaultValue !== undefined) {
      saved = getStartingProp(instance.id, meta, name);
    }
    getAndDelete(unprocessedKnown, name);
    initialPropsNames.delete(name);
    return { prop: saved, propName: name, meta };
  });

  const initialProps: PropAndMeta[] = [];
  for (const name of initialPropsNames) {
    const saved = getAndDelete<Prop>(unprocessedSaved, name);
    const known = getAndDelete(unprocessedKnown, name);

    if (known === undefined) {
      // eslint-disable-next-line no-console
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

    initialProps.push({ prop, propName: name, meta: known });
  }

  const addedProps: PropAndMeta[] = [];
  for (const prop of Array.from(unprocessedSaved.values()).reverse()) {
    let known = getAndDelete(unprocessedKnown, prop.name);

    // @todo:
    //   if meta is undefined, this means it's a "custom attribute"
    //   but because custom attributes not implemented yet,
    //   we'll show it as a regular optional prop for now
    if (known === undefined) {
      known = getDefaultMetaForType(prop.type);
    }

    addedProps.push({ prop, propName: prop.name, meta: known });
  }

  const handleAdd = (propName: string) => {
    const propMeta = unprocessedKnown.get(propName);
    if (propMeta === undefined) {
      throw new Error(`Attempting to add a prop not lised in availableProps`);
    }
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

  const handleDelete = (prop: Prop) => {
    deleteProp(prop.id);
  };

  return {
    handleAdd,
    handleChange,
    handleDelete,
    handleChangeByPropName,
    meta,
    /** Similar to Initial, but displayed as a separate group in UI etc.
     * Currentrly used only for the ID prop. */
    systemProps,
    /** Initial (not deletable) props */
    initialProps,
    /** Optional props that were added by user */
    addedProps,
    /** List of remaining props still available to add */
    availableProps: Array.from(
      unprocessedKnown.entries(),
      ([name, { label }]) => ({ name, label })
    ),
  };
};
