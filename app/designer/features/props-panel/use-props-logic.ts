import type {
  DeleteProp,
  Publish,
  UserProp,
  UserPropsUpdates,
} from "@webstudio-is/sdk";
import ObjectId from "bson-objectid";
import produce from "immer";
import debounce from "lodash.debounce";
import { useRef, useState } from "react";
import type { SelectedInstanceData } from "~/shared/canvas-components";

const getInitialProp = () => ({
  id: ObjectId().toString(),
  prop: "",
  value: "",
});

const initialUserProps = [getInitialProp()];

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
      ? initialUserProps
      : selectedInstanceData.props.props;
  const [userProps, setUserProps] = useState<Array<UserProp>>(props);
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

  const handleChangeProp = (
    id: UserProp["id"],
    field: keyof UserProp,
    value: UserProp["prop"] | UserProp["value"]
  ) => {
    const index = userProps.findIndex((item) => item.id === id);
    const nextUserProps = produce((draft: Array<UserProp>) => {
      if (field === "prop" && typeof value === "string") {
        draft[index].prop = value;
      } else draft[index].value = value;
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
    const index = nextUserProps.findIndex((item) => item.id === id);
    nextUserProps.splice(index, 1);
    setUserProps(nextUserProps);
    deleteProp(id);
  };

  const addEmptyProp = () => {
    setUserProps([...userProps, getInitialProp()]);
  };

  return {
    addEmptyProp,
    userProps,
    handleChangeProp,
    handleDeleteProp,
  };
};
