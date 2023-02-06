import { PlayIcon } from "@webstudio-is/icons";
import { theme } from "../stitches.config";
import {
  Toolbar,
  ToolbarToggleItem,
  ToolbarToggleGroup,
  ToolbarSeparator,
} from "./toolbar";

export default {
  title: "Library/Toolbar",
};

const ToolbarStory = () => {
  return (
    <Toolbar css={{ gap: theme.spacing[5] }}>
      <ToolbarToggleGroup type="single" value="2">
        <ToolbarToggleItem value="1">
          <PlayIcon />
        </ToolbarToggleItem>
        <ToolbarToggleItem value="2">
          <PlayIcon />
        </ToolbarToggleItem>
      </ToolbarToggleGroup>
      <ToolbarSeparator />
      <ToolbarToggleGroup type="single">
        <ToolbarToggleItem value="3" focused>
          <PlayIcon />
        </ToolbarToggleItem>
      </ToolbarToggleGroup>
    </Toolbar>
  );
};

export { ToolbarStory as Toolbar };
