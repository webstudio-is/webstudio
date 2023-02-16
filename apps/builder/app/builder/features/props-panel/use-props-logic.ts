import { useState } from "react";
import { nanoid } from "nanoid";
import type { Instance, Prop } from "@webstudio-is/project-build";
import type { WsComponentPropsMeta } from "@webstudio-is/react-sdk";
import { getComponentPropsMeta } from "@webstudio-is/react-sdk";

export type UserPropValue = Prop extends infer T
  ? T extends { value: unknown; type: unknown }
    ? { value: T["value"]; type: T["type"] }
    : never
  : never;

export const getValueFromPropMeta = (
  propValue?: WsComponentPropsMeta["props"][string]
) => {
  let typedValue: UserPropValue = {
    type: "string",
    value: `${propValue?.defaultValue ?? ""}`,
  };

  if (propValue?.control === "boolean") {
    typedValue = {
      type: "boolean",
      value: propValue.defaultValue ?? false,
    };
  }

  if (propValue?.control === "number") {
    typedValue = {
      type: "number",
      value: propValue.defaultValue ?? 0,
    };
  }

  return typedValue;
};

type UsePropsLogic = {
  props: Prop[];
  selectedInstance: Instance;
  updateProps: (update: Prop) => void;
  deleteProp: (id: Prop["id"]) => void;
};

const getPropFromMetaProps = (
  instanceId: Instance["id"],
  metaProps: WsComponentPropsMeta["props"],
  name: string
) => {
  const metaPropValue = metaProps[name];
  if (metaPropValue === undefined) {
    return undefined;
  }
  return {
    id: nanoid(),
    instanceId,
    name,
    ...getValueFromPropMeta(metaPropValue),
  };
};

/**
 * usePropsLogic expects that key={selectedInstanceData.id} is used on the ancestor component
 */
export const usePropsLogic = ({
  props,
  selectedInstance,
  updateProps,
  deleteProp,
}: UsePropsLogic) => {
  const { id: instanceId, component } = selectedInstance;

  const meta = getComponentPropsMeta(component);
  const metaProps = meta?.props ?? {};
  const initialProps = meta?.initialProps ?? [];

  const initialPropsByName = new Map<string, Prop>();
  for (const name of initialProps) {
    const prop = getPropFromMetaProps(instanceId, metaProps, name);
    if (prop) {
      initialPropsByName.set(name, prop);
    }
  }

  const [addedProps, setAddedProps] = useState<Prop[]>([]);
  const addedPropsById = new Map<string, Prop>();
  for (const prop of addedProps) {
    addedPropsById.set(prop.id, prop);
  }

  const propsById = new Map<string, Prop>();
  for (const prop of props) {
    if (initialPropsByName.has(prop.name)) {
      initialPropsByName.set(prop.name, prop);
      continue;
    }
    if (addedPropsById.has(prop.id)) {
      addedPropsById.set(prop.id, prop);
      continue;
    }
    propsById.set(prop.id, prop);
  }

  // maintain added props order until panel is closed
  // to prevent inputs jumping while user typing
  const userProps = [
    ...initialPropsByName.values(),
    ...propsById.values(),
    ...addedPropsById.values(),
  ];

  const handleChangePropName = (prop: Prop, name: string) => {
    // prevent changing name of required props
    if (initialProps.includes(prop.name)) {
      return;
    }
    const typedValue = getValueFromPropMeta(metaProps[name]);
    updateProps({ id: prop.id, instanceId, name, ...typedValue });
  };

  const handleChangePropValue = (prop: Prop, value: UserPropValue) => {
    updateProps({ ...prop, ...value });
  };

  const handleDeleteProp = (prop: Prop) => {
    // required prop should never be deleted
    if (initialProps.includes(prop.name)) {
      return;
    }
    const id = prop.id;
    deleteProp(id);
    setAddedProps((prev) => prev.filter((prop) => prop.id !== id));
  };

  const addEmptyProp = () => {
    setAddedProps((prev) => [
      ...prev,
      {
        id: nanoid(),
        instanceId,
        name: "",
        type: "string",
        value: "",
      },
    ]);
  };

  return {
    userProps,
    handleChangePropName,
    handleChangePropValue,
    handleDeleteProp,
    addEmptyProp,
    initialProps,
  };
};
