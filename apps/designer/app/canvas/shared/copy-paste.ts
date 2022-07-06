import {
  type InstanceProps,
  type Instance,
  allUserPropsContainer,
  publish,
} from "@webstudio-is/sdk";
import { selectedInstanceContainer } from "./nano-states";
import { cloneInstance } from "apps/designer/app/shared/tree-utils";
import { cloneProps } from "apps/designer/app/shared/props-utils";

let currentInstance: Instance | undefined;
let currentProps: InstanceProps | undefined;

export const copy = () => {
  if (selectedInstanceContainer.value === undefined) return;
  currentInstance = selectedInstanceContainer.value;
  currentProps = allUserPropsContainer.value[currentInstance.id];
};

export const paste = () => {
  if (currentInstance === undefined) return;
  const instance = cloneInstance(currentInstance);
  const props = currentProps
    ? cloneProps(currentProps, { instanceId: instance.id })
    : undefined;
  publish<"insertInstance", { instance: Instance; props?: InstanceProps }>({
    type: "insertInstance",
    payload: {
      instance,
      props,
    },
  });
};
