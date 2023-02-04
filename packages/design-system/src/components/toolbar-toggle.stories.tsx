import { PlayIcon } from "@webstudio-is/icons";
import { theme } from "../stitches.config";
import { Flex } from "./flex";
import { ToolbarToggle } from "./toolbar-toggle";

export default {
  title: "Library/Toolbar Toggle",
};

const ToolbarToggleStory = () => {
  return (
    <Flex
      gap="2"
      css={{
        background: theme.colors.backgroundTopbar,
        color: theme.colors.foregroundContrastMain,
      }}
    >
      <ToolbarToggle>
        <PlayIcon />
      </ToolbarToggle>
      <ToolbarToggle pressed>
        <PlayIcon />
      </ToolbarToggle>
      <ToolbarToggle focused>
        <PlayIcon />
      </ToolbarToggle>
    </Flex>
  );
};

export { ToolbarToggleStory as ToolbarToggle };
