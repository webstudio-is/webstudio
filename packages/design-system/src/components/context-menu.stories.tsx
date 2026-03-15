import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "./dropdown-menu";
import {
  CopyIcon,
  TrashIcon,
  PlusIcon,
  EllipsesIcon,
} from "@webstudio-is/icons";
import { IconButton } from "./icon-button";

export default {
  title: "Components/Context Menu",
};

export const ContextMenu = () => (
  <DropdownMenu defaultOpen>
    <DropdownMenuTrigger asChild>
      <IconButton>
        <EllipsesIcon />
      </IconButton>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuLabel>Actions</DropdownMenuLabel>
      <DropdownMenuItem icon={<CopyIcon />}>Copy</DropdownMenuItem>
      <DropdownMenuItem icon={<PlusIcon />}>Add item</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuCheckboxItem checked>Bookmarked</DropdownMenuCheckboxItem>
      <DropdownMenuSeparator />
      <DropdownMenuRadioGroup value="pedro">
        <DropdownMenuLabel>People</DropdownMenuLabel>
        <DropdownMenuRadioItem value="pedro">Pedro</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="colm">Colm</DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem icon={<TrashIcon />}>Delete</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);
