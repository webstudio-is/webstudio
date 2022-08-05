import type { Instance, Publish } from "@webstudio-is/react-sdk";
import { useSelectedInstancePath } from "~/designer/shared/instance/use-selected-instance-path";
import { useSelectedInstanceData } from "~/designer/shared/nano-states";
import { Tree } from "~/designer/shared/tree";
import { useRootInstance } from "~/shared/nano-states";

type NavigatorProps = {
  publish: Publish;
};

export const Navigator = ({ publish }: NavigatorProps) => {
  const [selectedInstanceData] = useSelectedInstanceData();
  const [rootInstance] = useRootInstance();
  const selectedInstancePath = useSelectedInstancePath(
    selectedInstanceData?.id
  );

  if (rootInstance === undefined) return null;
  return (
    <Tree
      instance={rootInstance}
      selectedInstancePath={selectedInstancePath}
      selectedInstanceId={selectedInstanceData?.id}
      onSelect={(instance) => {
        publish<"selectInstanceById", Instance["id"]>({
          type: "selectInstanceById",
          payload: instance.id,
        });
      }}
    />
  );
};
