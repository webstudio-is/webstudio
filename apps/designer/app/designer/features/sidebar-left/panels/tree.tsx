import { type Instance, type Publish } from "@webstudio-is/sdk";
import { ListNestedIcon } from "apps/designer/app/shared/icons";
import { Flex } from "apps/designer/app/shared/design-system";
import { type SelectedInstanceData } from "apps/designer/app/shared/canvas-components";
import { useSelectedInstancePath } from "apps/designer/app/designer/shared/instance/use-selected-instance-path";
import { Tree } from "apps/designer/app/designer/shared/tree";
import { useRootInstance } from "apps/designer/app/shared/nano-states";

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
