import { useStore } from "@nanostores/react";
import {
  hoveredInstanceIdStore,
  hoveredInstanceOutlineStore,
  instancesStore,
  selectedInstanceAddressStore,
  useTextEditingInstanceId,
} from "~/shared/nano-states";
import { Outline } from "./outline";
import { Label } from "./label";

export const HoveredInstanceOutline = () => {
  const selectedInstanceAddress = useStore(selectedInstanceAddressStore);
  const hoveredInstanceId = useStore(hoveredInstanceIdStore);
  const instanceOutline = useStore(hoveredInstanceOutlineStore);
  const [textEditingInstanceId] = useTextEditingInstanceId();
  const instances = useStore(instancesStore);

  const isEditingText = textEditingInstanceId !== undefined;
  // @todo compare instance addresses
  const isHoveringSelectedInstance =
    selectedInstanceAddress?.[0] === hoveredInstanceId;
  const instance = hoveredInstanceId
    ? instances.get(hoveredInstanceId)
    : undefined;

  if (
    instance === undefined ||
    instanceOutline === undefined ||
    isHoveringSelectedInstance ||
    isEditingText
  ) {
    return null;
  }

  return (
    <Outline rect={instanceOutline.rect}>
      <Label instance={instance} instanceRect={instanceOutline.rect} />
    </Outline>
  );
};
