import produce from "immer";
import { useState, useCallback, useEffect, useRef } from "react";
import debounce from "lodash.debounce";
import ObjectId from "bson-objectid";
import type { DeleteProp, UserProp, UserPropsUpdates } from "@webstudio-is/sdk";
import type { Publish } from "~/designer/features/canvas-iframe";
import type { SelectedInstanceData } from "~/shared/component";

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
      selectedInstanceData.props === undefined ||
      selectedInstanceData.props.props.length === 0
        ? initialUserProps
        : selectedInstanceData.props.props;
    setUserProps(props);
  }, [selectedInstanceData]);

  // @todo this may call the last callback after unmount
  // use useDebounce
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const updateProps = useCallback(
    debounce((updates: UserPropsUpdates["updates"]) => {
      if (selectedInstanceData === undefined) {
        return;
      }
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
    }, 1000),
    [selectedInstanceData?.id]
  );

  const deleteProp = (id: UserProp["id"]) => {
    if (selectedInstanceData === undefined) return;
    publish<"deleteProp", DeleteProp>({
      type: "deleteProp",
      payload: {
        propsId: selectedInstanceData.props.id,
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
