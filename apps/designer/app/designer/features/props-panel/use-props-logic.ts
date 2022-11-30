import type {
  DeleteProp,
  UserProp,
  UserPropsUpdates,
} from "@webstudio-is/react-sdk";
import { type Publish } from "~/shared/pubsub";
import { getComponentMetaProps } from "@webstudio-is/react-sdk";
import ObjectId from "bson-objectid";
import produce from "immer";
import uniqBy from "lodash/uniqBy";
import { useState } from "react";
import type { SelectedInstanceData } from "@webstudio-is/project";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    deleteProp: DeleteProp;
    updateProps: UserPropsUpdates;
  }
}

type UserPropValue = Extract<UserProp, { value: unknown }>["value"];
type UserPropAsset = Extract<UserProp, { asset: unknown }>["asset"];

type HandleChangePropName = (
  id: UserProp["id"],
  name: string,
  defaultValue: string | boolean | number
) => void;

type HandleChangePropValue = (id: UserProp["id"], value: UserPropValue) => void;

type HandleChangePropAsset = (id: UserProp["id"], asset: UserPropAsset) => void;

const getRequiredProps = (
  selectedInstanceData: SelectedInstanceData
): UserProp[] => {
  const { component } = selectedInstanceData;
  const meta = getComponentMetaProps(component);
  return Object.entries(meta)
    .filter(([_, value]) => value?.required)
    .map(([prop, _]) => ({
      id: ObjectId().toString(),
      prop,
      value: "",
      required: true,
    }));
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
    .map(([prop, propObj]) => {
      const value = propObj?.defaultValue ?? "";
      return {
        id: ObjectId().toString(),
        prop,
        value,
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

  const handleChangePropName: HandleChangePropName = (
    id,
    name,
    defaultValue
  ) => {
    const nextUserProps = produce((draft: Array<UserProp>) => {
      const index = draft.findIndex((item) => item.id === id);

      const isPropRequired = draft[index].required;

      if (isPropRequired !== true) {
        // @todo we need to now allow to change non required on required prop too
        draft[index] = {
          id: draft[index].id,
          prop: name,
          value: defaultValue,
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
      const val = draft[index];

      if ("value" in val) {
        val.value = value;
        return;
      }

      draft[index] = {
        id: val.id,
        prop: val.prop,
        required: val.required,
        value,
      };
    })(userProps);

    // Optimistically update the state (what if publish fails?)
    setUserProps(nextUserProps);

    const updatedProps = nextUserProps.filter((item) => item.id === id);

    updateProps(updatedProps);
  };

  const handleChangePropAsset: HandleChangePropAsset = (id, asset) => {
    const nextUserProps = produce((draft: Array<UserProp>) => {
      const index = draft.findIndex((item) => item.id === id);
      const val = draft[index];

      if ("asset" in val) {
        val.asset = asset;
        return;
      }

      draft[index] = {
        id: val.id,
        prop: val.prop,
        required: val.required,
        asset,
      };
    })(userProps);

    // Optimistically update the state (what if publish fails?)
    setUserProps(nextUserProps);

    const updatedProps = nextUserProps.filter((item) => item.id === id);

    updateProps(updatedProps);
  };

  // HandleChangePropAsset

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
        value: "",
      },
    ]);
  };

  return {
    addEmptyProp,
    userProps,
    handleChangePropName,
    handleChangePropValue,
    handleChangePropAsset,
    handleDeleteProp,
  };
};
