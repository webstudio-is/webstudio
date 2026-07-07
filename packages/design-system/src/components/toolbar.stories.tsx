import { PlayIcon, ChevronDownIcon } from "@webstudio-is/icons";
import { theme } from "../stitches.config";
import {
  Toolbar,
  ToolbarButton,
  ToolbarToggleItem,
  ToolbarToggleGroup,
  ToolbarSeparator,
} from "./toolbar";
import { StorySection } from "./storybook";

export default {
  title: "Toolbar",
};

export const ToolbarDemo = () => (
  <>
    <StorySection title="Toggle groups">
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
          <ToolbarToggleItem value="5" variant="chevron">
            <ChevronDownIcon />
          </ToolbarToggleItem>
        </ToolbarToggleGroup>
      </Toolbar>
    </StorySection>
    <StorySection title="Buttons">
      <Toolbar>
        <ToolbarButton>
          <PlayIcon size={22} />
        </ToolbarButton>
        <ToolbarButton variant="subtle">
          <PlayIcon size={22} />
        </ToolbarButton>
        <ToolbarButton variant="preview">
          <PlayIcon size={22} />
        </ToolbarButton>
        <ToolbarSeparator />
        <ToolbarButton focused>
          <PlayIcon size={22} />
        </ToolbarButton>
        <ToolbarButton variant="chevron">
          <ChevronDownIcon />
        </ToolbarButton>
      </Toolbar>
    </StorySection>
  </>
);
