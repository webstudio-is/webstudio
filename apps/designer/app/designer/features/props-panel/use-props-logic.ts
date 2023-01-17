import { useMemo, useState } from "react";
import ObjectId from "bson-objectid";
import warnOnce from "warn-once";
import type {
  UserProp,
  MetaProps,
  ComponentName,
} from "@webstudio-is/react-sdk";
import {
  getComponentMeta,
  getComponentMetaProps,
} from "@webstudio-is/react-sdk";
import type { SelectedInstanceData } from "@webstudio-is/project";

export type UserPropValue = UserProp extends infer T
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

const getRequiredPropsList = (component: ComponentName) => {
  const meta = getComponentMeta(component);
  const metaProps = getComponentMetaProps(component);

  const initialProps = meta.initialProps ?? [];
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
  props: UserProp[];
  selectedInstanceData: SelectedInstanceData;
  updateProps: (update: UserProp) => void;
  deleteProp: (id: UserProp["id"]) => void;
};

const getPropsItemFromMetaProps = (metaProps: MetaProps, name: string) => {
  const metaPropValue = metaProps[name];
  if (metaPropValue === undefined) {
    return undefined;
  }
  return {
    id: ObjectId().toString(),
    prop: name,
    ...getValueFromPropMeta(metaPropValue),
  };
};

/**
 * usePropsLogic expects that key={selectedInstanceData.id} is used on the ancestor component
 */
export const usePropsLogic = ({
  props,
  selectedInstanceData,
  updateProps,
  deleteProp,
}: UsePropsLogic) => {
  const { component } = selectedInstanceData;

  const metaProps = useMemo(
    () => getComponentMetaProps(component),
    [component]
  );
  const requiredPropsList = useMemo(
    () => getRequiredPropsList(component),
    [component]
  );
  const requiredPropsByName = new Map<string, UserProp>();
  for (const name of requiredPropsList) {
    const propsItem = getPropsItemFromMetaProps(metaProps, name);
    if (propsItem) {
      requiredPropsByName.set(name, propsItem);
    }
  }

  const [addedProps, setAddedProps] = useState<UserProp[]>([]);
  const addedPropsById = new Map<string, UserProp>();
  for (const propsItem of addedProps) {
    addedPropsById.set(propsItem.id, propsItem);
  }

  const propsById = new Map<string, UserProp>();
  for (const propsItem of props) {
    if (requiredPropsByName.has(propsItem.prop)) {
      requiredPropsByName.set(propsItem.prop, propsItem);
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

  const handleChangePropName = (propsItem: UserProp, name: string) => {
    // prevent changing name of required props
    if (isRequired(propsItem)) {
      return;
    }
    const typedValue = getValueFromPropMeta(metaProps[name]);
    updateProps({ id: propsItem.id, prop: name, ...typedValue });
  };

  const handleChangePropValue = (propsItem: UserProp, value: UserPropValue) => {
    updateProps({ ...propsItem, ...value });
  };

  const handleDeleteProp = (propsItem: UserProp) => {
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
        prop: "",
        type: "string",
        value: "",
      },
    ]);
  };

  const isRequired = (propsItem: UserProp) => {
    return propsItem.required || requiredPropsList.includes(propsItem.prop);
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
