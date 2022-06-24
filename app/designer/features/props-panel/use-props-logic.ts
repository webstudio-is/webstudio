import type {
  DeleteProp,
  Publish,
  UserProp,
  UserPropsUpdates,
} from "@webstudio-is/sdk";
import { componentsMeta } from "@webstudio-is/sdk";
import ObjectId from "bson-objectid";
import produce from "immer";
import uniqBy from "lodash/uniqBy";
import debounce from "lodash/debounce";
import { useRef, useState } from "react";
import type { SelectedInstanceData } from "~/shared/canvas-components";

export type handleChangePropType = (
  id: UserProp["id"],
  field: "prop" | "value",
  value: UserProp["prop"] | UserProp["value"]
) => void;

const getRequiredProps = (
  selectedInstanceData: SelectedInstanceData
): UserProp[] => {
  const { component } = selectedInstanceData;
  const meta = componentsMeta[component];
  const argTypes = meta?.argTypes || {};
  return Object.entries(argTypes)
    .filter(([_, value]) => value.required)
    .map(([prop, _]) => ({
      id: ObjectId().toString(),
      prop,
      value: "",
      required: true,
    }));
};

const getPropsWithDefaultValue = (
  selectedInstanceData: SelectedInstanceData
): UserProp[] => {
  const { component } = selectedInstanceData;
  const meta = componentsMeta[component];
  const argTypes = meta?.argTypes || {};
  return Object.entries(argTypes)
    .filter(([_, value]) => value.defaultValue != null)
    .map(([prop, propObj]) => {
      const { defaultValue } = propObj;
      const value = "value" in defaultValue ? defaultValue.value : defaultValue;
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
  const propsToPublishRef = useRef<{
    [id: UserProp["id"]]: true;
  }>({});

  // @todo this may call the last callback after unmount
  const updateProps = debounce((updates: UserPropsUpdates["updates"]) => {
    publish<"updateProps", UserPropsUpdates>({
      type: "updateProps",
      payload: {
        treeId: selectedInstanceData.props.treeId,
        propsId: selectedInstanceData.props.id,
        instanceId: selectedInstanceData.id,
        updates,
      },
    });
    for (const update of updates) {
      delete propsToPublishRef.current[update.id];
    }
  }, 1000);

  const deleteProp = (id: UserProp["id"]) => {
    publish<"deleteProp", DeleteProp>({
      type: "deleteProp",
      payload: {
        instanceId: selectedInstanceData.id,
        propId: id,
      },
    });
  };

  const handleChangeProp: handleChangePropType = (id, field, value) => {
    const index = userProps.findIndex((item) => item.id === id);
    const nextUserProps = produce((draft: Array<UserProp>) => {
      const isPropRequired = draft[index].required;
      switch (field) {
        case "prop":
          if (!isPropRequired) {
            // TODO: Use discriminant type to make this more clear or separate into 2 functions
            draft[index].prop = value as UserProp["prop"];
          }
          break;
        case "value":
          draft[index].value = value;
          break;
      }
    })(userProps);
    setUserProps(nextUserProps);

    propsToPublishRef.current[id] = true;
    const updates = Object.keys(propsToPublishRef.current)
      .map((id) => nextUserProps.find((prop) => prop.id === id))
      // Could be empty if you quickly remove props which have pending changes
      .filter(Boolean) as Array<UserProp>;
    updateProps(updates);
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
    handleChangeProp,
    handleDeleteProp,
  };
};
