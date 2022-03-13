import produce from "immer";
import { useState, useCallback, useEffect, useRef } from "react";
import debounce from "lodash.debounce";
import type { Publish } from "~/designer/iframe";
import type { DeleteProp, UserProp, UserPropsUpdates } from "@webstudio-is/sdk";
import type { SelectedInstanceData } from "~/shared/component";
import ObjectId from "bson-objectid";

const getInitialProp = () => ({
  id: ObjectId().toString(),
  prop: "",
  value: "",
});

const initialUserProps = [getInitialProp()];

type UsePropsLogic = {
  publish: Publish;
  selectedInstanceData?: SelectedInstanceData;
};

export const usePropsLogic = ({
  selectedInstanceData,
  publish,
}: UsePropsLogic) => {
  const [userProps, setUserProps] = useState<Array<UserProp>>(initialUserProps);
  const propsToPublishRef = useRef<{
    [id: UserProp["id"]]: true;
  }>({});

  useEffect(() => {
    if (selectedInstanceData === undefined) {
      return;
    }
    const props =
      selectedInstanceData.props.length === 0
        ? initialUserProps
        : selectedInstanceData.props;
    setUserProps(props);
  }, [selectedInstanceData?.props]);

  const updateProps = useCallback(
    // @todo this may call the last callback after unmount
    // use useDebounce
    debounce((updates) => {
      if (selectedInstanceData === undefined) return;
      publish<"updateProps", UserPropsUpdates>({
        type: "updateProps",
        payload: {
          instanceId: selectedInstanceData.id,
          updates,
        },
      });
      for (const update of updates) {
        delete propsToPublishRef.current[update.id];
      }
    }, 1000),
    [selectedInstanceData?.id]
  );

  const deleteProp = (id: UserProp["id"]) => {
    if (selectedInstanceData === undefined) return;
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
    value: string
  ) => {
    const index = userProps.findIndex((item) => item.id === id);
    const nextUserProps = produce((draft: Array<UserProp>) => {
      draft[index][field] = value;
    })(userProps);
    setUserProps(nextUserProps);

    propsToPublishRef.current[id] = true;
    const updates = Object.keys(propsToPublishRef.current)
      .map((id) => nextUserProps.find((prop) => prop.id === id))
      .filter(Boolean); // Can be empty if you quickly remove props which have pending changes
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
