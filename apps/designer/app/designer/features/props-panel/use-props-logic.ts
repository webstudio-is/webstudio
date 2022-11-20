import type {
  DeleteProp,
  UserProp,
  UserPropsUpdates,
} from "@webstudio-is/react-sdk";
import { type Publish } from "~/shared/pubsub";
import { componentsMeta } from "@webstudio-is/react-sdk";
import ObjectId from "bson-objectid";
import produce from "immer";
import uniqBy from "lodash/uniqBy";
import { useState } from "react";
import type { SelectedInstanceData } from "@webstudio-is/project";
import type { Asset } from "@webstudio-is/asset-uploader";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    deleteProp: DeleteProp;
    updateProps: UserPropsUpdates;
  }
}

type UserPropValue = Extract<UserProp, { value: unknown }>["value"];

type HandleChangePropName = (
  id: UserProp["id"],
  name: string,
  defaultValue: string | boolean
) => void;

type HandleChangePropValue = (
  id: UserProp["id"],
  value: UserPropValue,
  asset?: Asset
) => void;

const getRequiredProps = (
  selectedInstanceData: SelectedInstanceData
): UserProp[] => {
  const { component } = selectedInstanceData;
  const meta = componentsMeta[component];
  return Object.entries(meta)
    .filter(([_, value]) => value.required)
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
  const meta = componentsMeta[component];
  return Object.entries(meta)
    .filter(([_, value]) => value.defaultValue != null)
    .map(([prop, propObj]) => {
      const { defaultValue } = propObj;
      const value = defaultValue ?? "";
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
        draft[index].prop = name;
        draft[index].value = defaultValue;
      }
    })(userProps);

    // Optimistically update the state (what if publish fails?)
    setUserProps(nextUserProps);

    const updatedProps = nextUserProps.filter((item) => item.id === id);

    updateProps(updatedProps);
  };

  const handleChangePropValue: HandleChangePropValue = (id, value, asset) => {
    const nextUserProps = produce((draft: Array<UserProp>) => {
      const index = draft.findIndex((item) => item.id === id);
      const val = draft[index];

      val.value = value;
      if (asset) {
        val.asset = asset;
      } else if (val.asset != null) {
        delete val.asset;
      }
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
