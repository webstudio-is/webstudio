import {
  Button,
  Flex,
  PanelTitle,
  Separator,
  Tooltip,
} from "@webstudio-is/design-system";
import { XIcon } from "@webstudio-is/icons";
import { CssPreview } from "./css-preview";
import { NavigatorTree } from "./navigator-tree";
import { $isDesignMode } from "~/shared/nano-states";
import { useStore } from "@nanostores/react";

export const NavigatorPanel = ({ onClose }: { onClose: () => void }) => {
  const isDesignMode = useStore($isDesignMode);
  return (
    <>
      <PanelTitle
        suffix={
          <Tooltip content="Close panel" side="bottom">
            <Button
              onClick={onClose}
              color="ghost"
              prefix={<XIcon />}
              aria-label="Close panel"
            />
          </Tooltip>
        }
      >
        Navigator
      </PanelTitle>
      <Separator />
      <Flex grow direction="column" justify="end">
        <NavigatorTree />
        <Separator />
        {isDesignMode && <CssPreview />}
      </Flex>
    </>
  );
};
