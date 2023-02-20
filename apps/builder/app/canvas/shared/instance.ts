import { useEffect } from "react";
import type { Instance } from "@webstudio-is/project-build";
import { useTextEditingInstanceId } from "~/shared/nano-states";
import { publish } from "~/shared/pubsub";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    textEditingInstanceId?: Instance["id"];
  }
}

export const usePublishTextEditingInstanceId = () => {
  const [editingInstanceId] = useTextEditingInstanceId();
  useEffect(() => {
    publish({
      type: "textEditingInstanceId",
      payload: editingInstanceId,
    });
  }, [editingInstanceId]);
};
