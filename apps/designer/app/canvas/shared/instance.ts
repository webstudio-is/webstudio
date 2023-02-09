import { useEffect } from "react";
import store from "immerhin";
import type { Instance } from "@webstudio-is/project-build";
import { utils } from "@webstudio-is/project";
import { useSubscribe } from "~/shared/pubsub";
import {
  rootInstanceContainer,
  selectedInstanceIdStore,
  useTextEditingInstanceId,
} from "~/shared/nano-states";
import { publish } from "~/shared/pubsub";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    textEditingInstanceId?: Instance["id"];
    insertInstance: {
      instance: Instance;
      dropTarget?: { parentId: Instance["id"]; position: number | "end" };
    };
  }
}

export const useInsertInstance = () => {
  useSubscribe("insertInstance", ({ instance, dropTarget }) => {
    store.createTransaction([rootInstanceContainer], (rootInstance) => {
      if (rootInstance === undefined) {
        return;
      }
      utils.tree.insertInstanceMutable(rootInstance, instance, dropTarget);
    });
    selectedInstanceIdStore.set(instance.id);
  });
};

export const usePublishTextEditingInstanceId = () => {
  const [editingInstanceId] = useTextEditingInstanceId();
  useEffect(() => {
    publish({
      type: "textEditingInstanceId",
      payload: editingInstanceId,
    });
  }, [editingInstanceId]);
};
