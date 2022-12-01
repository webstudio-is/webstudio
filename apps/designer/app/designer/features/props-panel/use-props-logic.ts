import type {
  DeleteProp,
  UserProp,
  UserPropsUpdates,
  MetaProps,
} from "@webstudio-is/react-sdk";
import { type Publish } from "~/shared/pubsub";
import { getComponentMetaProps } from "@webstudio-is/react-sdk";
import ObjectId from "bson-objectid";
import produce from "immer";
import uniqBy from "lodash/uniqBy";
import { useState } from "react";
import type { SelectedInstanceData } from "@webstudio-is/project";
import warnOnce from "warn-once";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    deleteProp: DeleteProp;
    updateProps: UserPropsUpdates;
  }
}

export type UserPropValue = UserProp extends infer T
  ? T extends { value: unknown; type: unknown }
    ? { value: T["value"]; type: T["type"] }
    : never
  : never;

type HandleChangePropName = (id: UserProp["id"], name: string) => void;

type HandleChangePropValue = (id: UserProp["id"], value: UserPropValue) => void;

export const getValueFromPropMeta = (propValue: MetaProps[string]) => {
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

const getRequiredProps = (
  selectedInstanceData: SelectedInstanceData
): UserProp[] => {
  const { component } = selectedInstanceData;
  const meta = getComponentMetaProps(component);

  return Object.entries(meta)
    .filter(([_, value]) => value?.required)
    .map(([prop, propValue]) => {
      warnOnce(
        propValue?.defaultValue == null,
        `Default value for required "${prop}" is required`
      );

      const typedValue = getValueFromPropMeta(propValue);

      return {
        id: ObjectId().toString(),
        prop,
        ...typedValue,
        required: true,
      };
    });
};

// @todo: This returns same props for all instances.
// See the failing test in use-props-logic.test.ts
const getPropsWithDefaultValue = (
  selectedInstanceData: SelectedInstanceData
): UserProp[] => {
  const { component } = selectedInstanceData;
  const meta = getComponentMetaProps(component);

  return Object.entries(meta)
    .filter(([_, value]) => value?.defaultValue != null)
    .map(([prop, propValue]) => {
      const typedValue = getValueFromPropMeta(propValue);

      return {
        id: ObjectId().toString(),
        prop,
        ...typedValue,
      };
    });
};

type UsePropsLogic = {
  publish: Publish;
  selectedInstanceData: SelectedInstanceData;
};

export const usePropsLogic = ({
  selectedInstanceData,
  publish,
}: UsePropsLogic) => {
  const props =
    selectedInstanceData.props === undefined ||
    selectedInstanceData.props.props.length === 0
      ? []
      : selectedInstanceData.props.props;

  const initialState = uniqBy(
    [
      ...props,
      ...getPropsWithDefaultValue(selectedInstanceData),
      ...getRequiredProps(selectedInstanceData),
    ],
    "prop"
  );

  const [userProps, setUserProps] = useState<Array<UserProp>>(initialState);

  const updateProps = (updates: UserPropsUpdates["updates"]) => {
    publish({
      type: "updateProps",
      payload: {
        treeId: selectedInstanceData.props.treeId,
        propsId: selectedInstanceData.props.id,
        instanceId: selectedInstanceData.id,
        updates,
      },
    });
  };

  const deleteProp = (id: UserProp["id"]) => {
    publish({
      type: "deleteProp",
      payload: {
        instanceId: selectedInstanceData.id,
        propId: id,
      },
    });
  };

  const handleChangePropName: HandleChangePropName = (id, name) => {
    const nextUserProps = produce((draft: Array<UserProp>) => {
      const index = draft.findIndex((item) => item.id === id);

      const isPropRequired = draft[index].required;

      if (isPropRequired !== true) {
        const { component } = selectedInstanceData;
        const meta = getComponentMetaProps(component);

        let typedValue: UserPropValue = { type: "string", value: "" };
        if (name in meta) {
          typedValue = getValueFromPropMeta(meta[name]);
        }

        // @todo we need to not allow changing non required on required prop too
        draft[index] = {
          id: draft[index].id,
          prop: name,
          ...typedValue,
        };
      }
    })(userProps);

    // Optimistically update the state (what if publish fails?)
    setUserProps(nextUserProps);

    const updatedProps = nextUserProps.filter((item) => item.id === id);

    updateProps(updatedProps);
  };

  const handleChangePropValue: HandleChangePropValue = (id, value) => {
    const nextUserProps = produce((draft: Array<UserProp>) => {
      const index = draft.findIndex((item) => item.id === id);

      draft[index] = {
        ...draft[index],
        ...value,
      };
    })(userProps);

    // Optimistically update the state (what if publish fails?)
    setUserProps(nextUserProps);

    const updatedProps = nextUserProps.filter((item) => item.id === id);

    updateProps(updatedProps);
  };

  const handleDeleteProp = (id: UserProp["id"]) => {
    const nextUserProps = [...userProps];
    const prop = userProps.find((prop) => prop.id === id);

    // Required prop should never be deleted
    if (prop === undefined || prop.required) return;

    const index = nextUserProps.indexOf(prop);
    nextUserProps.splice(index, 1);
    setUserProps(nextUserProps);
    deleteProp(id);
  };

  const addEmptyProp = () => {
    setUserProps([
      ...userProps,
      {
        id: ObjectId().toString(),
        prop: "",
        type: "string",
        value: "",
      },
    ]);
  };

  return {
    addEmptyProp,
    userProps,
    handleChangePropName,
    handleChangePropValue,
    handleDeleteProp,
  };
};
