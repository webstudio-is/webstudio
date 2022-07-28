import { type Instance, type Publish } from "@webstudio-is/react-sdk";
import { ListNestedIcon } from "@webstudio-is/icons";
import { Flex } from "@webstudio-is/design-system";
import { type SelectedInstanceData } from "~/shared/canvas-components";
import { useSelectedInstancePath } from "~/designer/shared/instance/use-selected-instance-path";
import { Tree } from "~/designer/shared/tree";
import { useRootInstance } from "~/shared/nano-states";

type TabContentProps = {
  publish: Publish;
  selectedInstanceData?: SelectedInstanceData;
};

export const TabContent = ({
  publish,
  selectedInstanceData,
}: TabContentProps) => {
  const [rootInstance] = useRootInstance();
  const selectedInstancePath = useSelectedInstancePath(
    selectedInstanceData?.id
  );

  if (rootInstance === undefined) return null;

  return (
    <Flex gap="3" direction="column" css={{ padding: "$1" }}>
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
    </Flex>
  );
};

export const icon = <ListNestedIcon />;
