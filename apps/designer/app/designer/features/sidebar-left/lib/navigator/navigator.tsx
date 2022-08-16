import { Flex } from "@webstudio-is/design-system";
import type { Instance, Publish } from "@webstudio-is/react-sdk";
import { useSelectedInstanceData } from "~/designer/shared/nano-states";
import { Tree } from "~/designer/shared/tree";
import { useRootInstance } from "~/shared/nano-states";
import { Header } from "../header";

type NavigatorProps = {
  publish: Publish;
  isClosable?: boolean;
  onClose?: () => void;
};

export const Navigator = ({ publish, isClosable, onClose }: NavigatorProps) => {
  const [selectedInstanceData] = useSelectedInstanceData();
  const [rootInstance] = useRootInstance();

  if (rootInstance === undefined) return null;
  return (
    <Flex css={{ height: "100%", flexDirection: "column" }}>
      <Header title="Navigator" onClose={onClose} isClosable={isClosable} />
      <Flex css={{ flexGrow: 1, flexDirection: "column" }}>
        <Tree
          root={rootInstance}
          selectedInstanceId={selectedInstanceData?.id}
          onSelect={(instanceId) => {
            publish<"selectInstanceById", Instance["id"]>({
              type: "selectInstanceById",
              payload: instanceId,
            });
          }}
          onDragEnd={(payload) => {
            publish<
              "reparentInstance",
              {
                instanceId: Instance["id"];
                dropTarget: {
                  instanceId: Instance["id"];
                  position: number | "end";
                };
              }
            >({ type: "reparentInstance", payload });
          }}
        />
      </Flex>
    </Flex>
  );
};
