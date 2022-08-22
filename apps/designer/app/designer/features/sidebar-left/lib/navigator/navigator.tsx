import { Box } from "@webstudio-is/design-system";
import type { Instance } from "@webstudio-is/react-sdk";
import { type Publish } from "~/shared/pubsub";
import { useSelectedInstancePath } from "~/designer/shared/instance/use-selected-instance-path";
import { useSelectedInstanceData } from "~/designer/shared/nano-states";
import { Tree } from "~/designer/shared/tree";
import { useRootInstance } from "~/shared/nano-states";
import { Header } from "../header";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    selectInstanceById: Instance["id"];
  }
}

type NavigatorProps = {
  publish: Publish;
  isClosable?: boolean;
  onClose?: () => void;
};

export const Navigator = ({ publish, isClosable, onClose }: NavigatorProps) => {
  const [selectedInstanceData] = useSelectedInstanceData();
  const [rootInstance] = useRootInstance();
  const selectedInstancePath = useSelectedInstancePath(
    selectedInstanceData?.id
  );

  if (rootInstance === undefined) return null;
  return (
    <>
      <Header title="Navigator" onClose={onClose} isClosable={isClosable} />
      <Box css={{ padding: "$1" }}>
        <Tree
          instance={rootInstance}
          selectedInstancePath={selectedInstancePath}
          selectedInstanceId={selectedInstanceData?.id}
          onSelect={(instance) => {
            publish({
              type: "selectInstanceById",
              payload: instance.id,
            });
          }}
        />
      </Box>
    </>
  );
};
