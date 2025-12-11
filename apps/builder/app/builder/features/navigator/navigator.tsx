import { Flex, PanelTitle, Separator } from "@webstudio-is/design-system";
import { CssPreview } from "./css-preview";
import { NavigatorTree } from "./navigator-tree";
import { $isDesignMode } from "~/shared/nano-states";
import { useStore } from "@nanostores/react";

export const NavigatorPanel = (_props: { onClose: () => void }) => {
  const isDesignMode = useStore($isDesignMode);
  return (
    <>
      <PanelTitle>Navigator</PanelTitle>
      <Separator />
      <Flex grow direction="column" justify="end">
        <NavigatorTree />
        <Separator />
        {isDesignMode && <CssPreview />}
      </Flex>
    </>
  );
};
