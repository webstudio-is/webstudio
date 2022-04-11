import {
  type InstanceProps,
  type Instance,
  allUserPropsContainer,
} from "@webstudio-is/sdk";
import { selectedInstanceContainer } from "./nano-values";
import { cloneInstance } from "~/shared/tree-utils";
import { cloneProps } from "~/shared/props-utils";
import { publish } from "./pubsub";

let currentInstance: Instance;
let currentProps: InstanceProps;

export const copy = () => {
  if (selectedInstanceContainer.value === undefined) return;
  currentInstance = selectedInstanceContainer.value;
  currentProps = allUserPropsContainer.value[currentInstance.id];
};

export const paste = () => {
  if (currentInstance === undefined) return;
  const instance = cloneInstance(currentInstance);
  publish<"insertInstance", { instance: Instance; props: InstanceProps }>({
    type: "insertInstance",
    payload: {
      instance,
      props: cloneProps(currentProps, { instanceId: instance.id }),
    },
  });
};
