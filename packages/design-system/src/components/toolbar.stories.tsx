import { PlayIcon } from "@webstudio-is/icons";
import { Toolbar, ToolbarToggleItem, ToolbarToggleGroup } from "./toolbar";

export default {
  title: "Library/Toolbar",
};

const ToolbarStory = () => {
  return (
    <Toolbar>
      <ToolbarToggleGroup type="single" value="2">
        <ToolbarToggleItem value="1">
          <PlayIcon />
        </ToolbarToggleItem>
        <ToolbarToggleItem value="2">
          <PlayIcon />
        </ToolbarToggleItem>
        <ToolbarToggleItem value="3" focused>
          <PlayIcon />
        </ToolbarToggleItem>
      </ToolbarToggleGroup>
    </Toolbar>
  );
};

export { ToolbarStory as Toolbar };
