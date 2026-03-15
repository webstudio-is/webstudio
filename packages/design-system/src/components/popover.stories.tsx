import { Button } from "./button";
import { Text } from "./text";
import { StorySection } from "./storybook";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTitle,
  PopoverTitleActions,
  PopoverTrigger,
  PopoverSeparator,
} from "./popover";
import { MenuItemButton } from "./menu";
import { theme } from "../stitches.config";
import { Flex } from "./flex";

export default {
  title: "Popover",
};

const PopoverDemo = () => (
  <StorySection title="Popover">
    <Popover defaultOpen>
      <PopoverTrigger asChild>
        <Button>Open</Button>
      </PopoverTrigger>
      <PopoverContent>
        <Flex css={{ padding: theme.spacing[7] }}>
          <Text>Some content</Text>
        </Flex>
        <PopoverSeparator />
        <Flex css={{ padding: theme.spacing[3] }}>
          <PopoverClose>
            <MenuItemButton>Close</MenuItemButton>
          </PopoverClose>
        </Flex>
      </PopoverContent>
    </Popover>
  </StorySection>
);
export { PopoverDemo as Popover };

export const WithTitle = () => (
  <StorySection title="With title">
    <Popover defaultOpen>
      <PopoverTrigger asChild>
        <Button>Open</Button>
      </PopoverTrigger>
      <PopoverContent>
        <Flex direction="column" gap="2" style={{ padding: 12 }}>
          <Text>Content with a title bar</Text>
        </Flex>
        <PopoverTitle>Panel title</PopoverTitle>
      </PopoverContent>
    </Popover>
  </StorySection>
);

export const WithTitleActions = () => (
  <StorySection title="With title actions">
    <Popover defaultOpen>
      <PopoverTrigger asChild>
        <Button>Open</Button>
      </PopoverTrigger>
      <PopoverContent>
        <Flex direction="column" gap="2" style={{ padding: 12 }}>
          <Text>Content with title actions</Text>
        </Flex>
        <PopoverTitle
          suffix={
            <PopoverTitleActions>
              <PopoverClose />
            </PopoverTitleActions>
          }
        >
          Settings
        </PopoverTitle>
      </PopoverContent>
    </Popover>
  </StorySection>
);

export const SidePlacement = () => (
  <StorySection title="Side placement">
    <Flex gap="9" style={{ padding: 100 }}>
      <Popover defaultOpen>
        <PopoverTrigger asChild>
          <Button>Right</Button>
        </PopoverTrigger>
        <PopoverContent side="right">
          <Flex direction="column" gap="2" style={{ padding: 12 }}>
            <Text>Right side</Text>
          </Flex>
        </PopoverContent>
      </Popover>
      <Popover defaultOpen>
        <PopoverTrigger asChild>
          <Button>Top</Button>
        </PopoverTrigger>
        <PopoverContent side="top">
          <Flex direction="column" gap="2" style={{ padding: 12 }}>
            <Text>Top side</Text>
          </Flex>
        </PopoverContent>
      </Popover>
      <Popover defaultOpen>
        <PopoverTrigger asChild>
          <Button>Bottom</Button>
        </PopoverTrigger>
        <PopoverContent side="bottom" sideOffset={16}>
          <Flex direction="column" gap="2" style={{ padding: 12 }}>
            <Text>Bottom with custom offset</Text>
          </Flex>
        </PopoverContent>
      </Popover>
    </Flex>
  </StorySection>
);
