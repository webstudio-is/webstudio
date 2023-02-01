import { Button } from "./button";
import { Text } from "./text";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
  PopoverContentContainer,
  PopoverMenuItemContainer,
  PopoverSeparator,
} from "./popover";
import { MenuItemButton } from "./menu";

export default {
  title: "Library/Popover",
};

const PopoverDemo = () => (
  <Popover defaultOpen>
    <PopoverTrigger asChild>
      <Button>Open</Button>
    </PopoverTrigger>
    <PopoverContent>
      <PopoverContentContainer>
        <Text>Some content</Text>
      </PopoverContentContainer>
      <PopoverSeparator />
      <PopoverMenuItemContainer>
        <PopoverClose asChild>
          <MenuItemButton>Close</MenuItemButton>
        </PopoverClose>
      </PopoverMenuItemContainer>
    </PopoverContent>
  </Popover>
);
export { PopoverDemo as Popover };
