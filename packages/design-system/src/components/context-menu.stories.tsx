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
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuArrow,
} from "./dropdown-menu";
import {
  CopyIcon,
  TrashIcon,
  PlusIcon,
  EllipsesIcon,
} from "@webstudio-is/icons";
import { IconButton } from "./icon-button";
import { StorySection } from "./storybook";

export default {
  title: "Components/Context Menu",
};

export const ContextMenu = () => (
  <StorySection title="Context menu">
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
  </StorySection>
);

export const WithSubMenu = () => (
  <StorySection title="With sub menu">
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger asChild>
        <IconButton>
          <EllipsesIcon />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Regular item</DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>More options</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem>Sub item one</DropdownMenuItem>
            <DropdownMenuItem>Sub item two</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Another item</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </StorySection>
);

export const DestructiveAndDisabled = () => (
  <StorySection title="Destructive and disabled">
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger asChild>
        <IconButton>
          <EllipsesIcon />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Normal item</DropdownMenuItem>
        <DropdownMenuItem disabled>Disabled item</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem icon={<TrashIcon />} destructive>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </StorySection>
);

export const WithHintAndArrow = () => (
  <StorySection title="With hint and arrow">
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger asChild>
        <IconButton>
          <EllipsesIcon />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Regular item</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem hint>Press ⌘K to search</DropdownMenuItem>
        <DropdownMenuArrow />
      </DropdownMenuContent>
    </DropdownMenu>
  </StorySection>
);
