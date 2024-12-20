import { Button } from "./button";
import { Text } from "./text";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
  PopoverSeparator,
} from "./popover";
import { MenuItemButton } from "./menu";
import { theme } from "../stitches.config";
import { Flex } from "./flex";

export default {
  title: "Library/Popover",
};

const PopoverDemo = () => (
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
);
export { PopoverDemo as Popover };
