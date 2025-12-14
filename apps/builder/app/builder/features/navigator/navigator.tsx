import { Flex, PanelTitle, Separator } from "@webstudio-is/design-system";
import { CssPreview } from "./css-preview";
import { NavigatorTree } from "./navigator-tree";
import { $isDesignMode } from "~/shared/nano-states";
import { useStore } from "@nanostores/react";
import { InstanceContextMenu } from "~/builder/shared/instance-context-menu";

export const NavigatorPanel = (_props: { onClose: () => void }) => {
  const isDesignMode = useStore($isDesignMode);
  return (
    <>
      <PanelTitle>Navigator</PanelTitle>
      <Separator />
      <InstanceContextMenu>
        <Flex grow direction="column" justify="end">
          <NavigatorTree />
        </Flex>
      </InstanceContextMenu>
      <Separator />
      {isDesignMode && <CssPreview />}
    </>
  );
};
