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
          <PlayIcon size={22} />
        </ToolbarToggleItem>
        <ToolbarToggleItem value="2">
          <PlayIcon size={22} />
        </ToolbarToggleItem>
      </ToolbarToggleGroup>
      <ToolbarSeparator />
      <ToolbarToggleGroup type="single" value="4">
        <ToolbarToggleItem value="3" variant="subtle">
          <PlayIcon size={22} />
        </ToolbarToggleItem>
        <ToolbarToggleItem value="4" variant="preview">
          <PlayIcon size={22} />
        </ToolbarToggleItem>
      </ToolbarToggleGroup>
      <ToolbarSeparator />
      <ToolbarToggleGroup type="single">
        <ToolbarToggleItem value="5" focused>
          <PlayIcon size={22} />
        </ToolbarToggleItem>
      </ToolbarToggleGroup>
    </Toolbar>
  );
};

export { ToolbarStory as Toolbar };
