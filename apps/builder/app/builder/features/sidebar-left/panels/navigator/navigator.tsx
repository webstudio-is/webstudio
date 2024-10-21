import {
  Button,
  Flex,
  PanelTitle,
  Separator,
  Tooltip,
} from "@webstudio-is/design-system";
import { CrossIcon } from "@webstudio-is/icons";
import { CssPreview } from "./css-preview";
import { NavigatorTree } from "./navigator-tree";

export const NavigatorPanel = ({ onClose }: { onClose: () => void }) => {
  return (
    <>
      <PanelTitle
        suffix={
          <Tooltip content="Close panel" side="bottom">
            <Button
              onClick={onClose}
              color="ghost"
              prefix={<CrossIcon />}
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
        <CssPreview />
      </Flex>
    </>
  );
};
