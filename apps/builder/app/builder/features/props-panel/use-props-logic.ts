import { useMemo, useState } from "react";
import { nanoid } from "nanoid";
import warnOnce from "warn-once";
import type { Instance, Prop } from "@webstudio-is/project-build";
import type { MetaProps } from "@webstudio-is/react-sdk";
import {
  getComponentMeta,
  getComponentMetaProps,
} from "@webstudio-is/react-sdk";

export type UserPropValue = Prop extends infer T
  ? T extends { value: unknown; type: unknown }
    ? { value: T["value"]; type: T["type"] }
    : never
  : never;

export const getValueFromPropMeta = (propValue?: MetaProps[string]) => {
  let typedValue: UserPropValue = {
    type: "string",
    value: `${propValue?.defaultValue ?? ""}`,
  };

  if (propValue?.type === "boolean") {
    typedValue = {
      type: "boolean",
      value: propValue.defaultValue ?? false,
    };
  }

  if (propValue?.type === "number") {
    typedValue = {
      type: "number",
      value: propValue.defaultValue ?? 0,
    };
  }

  return typedValue;
};

const getRequiredPropsList = (component: string) => {
  const meta = getComponentMeta(component);
  const metaProps = getComponentMetaProps(component) ?? {};

  const initialProps = meta?.initialProps ?? [];
  const requiredProps = [];
  const propsWithDefaultValue = [];

  for (const [prop, value] of Object.entries(metaProps)) {
    if (value?.required) {
      warnOnce(
        value.defaultValue == null,
        `Default value for required "${prop}" is required`
      );
      requiredProps.push(prop);
    }
    if (value?.defaultValue != null) {
      propsWithDefaultValue.push(prop);
    }
  }

  // deduplicate required props
  return Array.from(
    new Set<string>([
      ...initialProps,
      ...requiredProps,
      ...propsWithDefaultValue,
    ])
  );
};

type UsePropsLogic = {
  props: Prop[];
  selectedInstance: Instance;
  updateProps: (update: Prop) => void;
  deleteProp: (id: Prop["id"]) => void;
};

const getPropFromMetaProps = (
  instanceId: Instance["id"],
  metaProps: MetaProps,
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

  const metaProps = useMemo(
    () => getComponentMetaProps(component) ?? {},
    [component]
  );
  const requiredPropsList = useMemo(
    () => getRequiredPropsList(component),
    [component]
  );
  const requiredPropsByName = new Map<string, Prop>();
  for (const name of requiredPropsList) {
    const prop = getPropFromMetaProps(instanceId, metaProps, name);
    if (prop) {
      requiredPropsByName.set(name, prop);
    }
  }

  const [addedProps, setAddedProps] = useState<Prop[]>([]);
  const addedPropsById = new Map<string, Prop>();
  for (const prop of addedProps) {
    addedPropsById.set(prop.id, prop);
  }

  const propsById = new Map<string, Prop>();
  for (const prop of props) {
    if (requiredPropsByName.has(prop.name)) {
      requiredPropsByName.set(prop.name, prop);
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
    ...requiredPropsByName.values(),
    ...propsById.values(),
    ...addedPropsById.values(),
  ];

  const handleChangePropName = (prop: Prop, name: string) => {
    // prevent changing name of required props
    if (isRequired(prop)) {
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
    if (isRequired(prop)) {
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

  const isRequired = (prop: Prop) => {
    return prop.required || requiredPropsList.includes(prop.name);
  };

  return {
    userProps,
    handleChangePropName,
    handleChangePropValue,
    handleDeleteProp,
    addEmptyProp,
    isRequired,
  };
};
