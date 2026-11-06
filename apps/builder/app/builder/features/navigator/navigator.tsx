import { Flex, PanelTitle, Separator } from "@webstudio-is/design-system";
import { NavigatorTree } from "./navigator-tree";
import { InstanceContextMenu } from "~/builder/shared/instance-context-menu";

export const NavigatorPanel = (_props: { onClose: () => void }) => {
  return (
    <>
      <PanelTitle>Navigator</PanelTitle>
      <Separator />
      <InstanceContextMenu>
        <Flex grow direction="column" justify="end">
          <NavigatorTree />
        </Flex>
      </InstanceContextMenu>
    </>
  );
};
