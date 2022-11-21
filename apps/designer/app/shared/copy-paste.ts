import { type InstanceProps, type Instance } from "@webstudio-is/react-sdk";
import { utils } from "@webstudio-is/project";
import { cloneProps } from "~/shared/props-utils";
import { useSubscribe, type Publish } from "~/shared/pubsub";
import { useSelectedInstanceData } from "~/designer/shared/nano-states";
import { useRootInstance } from "./nano-states";

let currentData:
  | { instance: Instance; props: InstanceProps | undefined }
  | undefined;

export const useSubscribeCopyPaste = (publish: Publish) => {
  const [selectedInstanceData] = useSelectedInstanceData();
  const [rootInstance] = useRootInstance();

  useSubscribe("copy", () => {
    if (selectedInstanceData === undefined || rootInstance === undefined) {
      return;
    }
    const instance = utils.tree.findInstanceById(
      rootInstance,
      selectedInstanceData.id
    );
    if (instance === undefined) {
      return;
    }
    currentData = {
      instance,
      props:
        selectedInstanceData.props.props.length > 0
          ? selectedInstanceData.props
          : undefined,
    };
  });

  useSubscribe("paste", () => {
    if (currentData === undefined) {
      return;
    }

    const instance = utils.tree.cloneInstance(currentData.instance);

    const props = currentData.props
      ? cloneProps(currentData.props, { instanceId: instance.id })
      : undefined;

    publish({
      type: "insertInstance",
      payload: { instance, props },
    });
  });
};
