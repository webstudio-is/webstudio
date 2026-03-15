import { useState } from "react";
import { Flex } from "./flex";
import { Button } from "./button";
import {
  DropdownMenu as DropdownMenuComponent,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "./dropdown-menu";

export default {
  title: "Dropdown Menu",
};

export const DropdownMenu = () => {
  const [bold, setBold] = useState(true);
  const [italic, setItalic] = useState(false);
  return (
    <Flex gap="9" css={{ padding: 100 }}>
      <DropdownMenuComponent open>
        <DropdownMenuTrigger asChild>
          <Button>Items</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>New file</DropdownMenuItem>
          <DropdownMenuItem>Open project</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Settings</DropdownMenuItem>
          <DropdownMenuItem disabled>Disabled item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuComponent>

      <DropdownMenuComponent open>
        <DropdownMenuTrigger asChild>
          <Button>Checkboxes</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem checked={bold} onCheckedChange={setBold}>
            Bold
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={italic}
            onCheckedChange={setItalic}
          >
            Italic
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenuComponent>
    </Flex>
  );
};
