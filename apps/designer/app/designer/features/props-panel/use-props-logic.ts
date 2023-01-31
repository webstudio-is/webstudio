import { useMemo, useState } from "react";
import ObjectId from "bson-objectid";
import warnOnce from "warn-once";
import type { Instance, PropsItem } from "@webstudio-is/project-build";
import type { MetaProps } from "@webstudio-is/react-sdk";
import {
  getComponentMeta,
  getComponentMetaProps,
} from "@webstudio-is/react-sdk";

export type UserPropValue = PropsItem extends infer T
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
  props: PropsItem[];
  selectedInstance: Instance;
  updateProps: (update: PropsItem) => void;
  deleteProp: (id: PropsItem["id"]) => void;
};

const getPropsItemFromMetaProps = (
  instanceId: Instance["id"],
  metaProps: MetaProps,
  name: string
) => {
  const metaPropValue = metaProps[name];
  if (metaPropValue === undefined) {
    return undefined;
  }
  return {
    id: ObjectId().toString(),
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
  const requiredPropsByName = new Map<string, PropsItem>();
  for (const name of requiredPropsList) {
    const propsItem = getPropsItemFromMetaProps(instanceId, metaProps, name);
    if (propsItem) {
      requiredPropsByName.set(name, propsItem);
    }
  }

  const [addedProps, setAddedProps] = useState<PropsItem[]>([]);
  const addedPropsById = new Map<string, PropsItem>();
  for (const propsItem of addedProps) {
    addedPropsById.set(propsItem.id, propsItem);
  }

  const propsById = new Map<string, PropsItem>();
  for (const propsItem of props) {
    if (requiredPropsByName.has(propsItem.name)) {
      requiredPropsByName.set(propsItem.name, propsItem);
      continue;
    }
    if (addedPropsById.has(propsItem.id)) {
      addedPropsById.set(propsItem.id, propsItem);
      continue;
    }
    propsById.set(propsItem.id, propsItem);
  }

  // maintain added props order until panel is closed
  // to prevent inputs jumping while user typing
  const userProps = [
    ...requiredPropsByName.values(),
    ...propsById.values(),
    ...addedPropsById.values(),
  ];

  const handleChangePropName = (propsItem: PropsItem, name: string) => {
    // prevent changing name of required props
    if (isRequired(propsItem)) {
      return;
    }
    const typedValue = getValueFromPropMeta(metaProps[name]);
    updateProps({ id: propsItem.id, instanceId, name, ...typedValue });
  };

  const handleChangePropValue = (
    propsItem: PropsItem,
    value: UserPropValue
  ) => {
    updateProps({ ...propsItem, ...value });
  };

  const handleDeleteProp = (propsItem: PropsItem) => {
    // required prop should never be deleted
    if (isRequired(propsItem)) {
      return;
    }
    const id = propsItem.id;
    deleteProp(id);
    setAddedProps((prev) => prev.filter((propsItem) => propsItem.id !== id));
  };

  const addEmptyProp = () => {
    setAddedProps((prev) => [
      ...prev,
      {
        id: ObjectId().toString(),
        instanceId,
        name: "",
        type: "string",
        value: "",
      },
    ]);
  };

  const isRequired = (propsItem: PropsItem) => {
    return propsItem.required || requiredPropsList.includes(propsItem.name);
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
