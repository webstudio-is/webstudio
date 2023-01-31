import { Button } from "./button";
import { typography } from "./typography";
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
        <div className={typography.regular()}>Some content</div>
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
