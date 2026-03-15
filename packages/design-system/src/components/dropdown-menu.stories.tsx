import { useState } from "react";
import { CopyIcon, TrashIcon } from "@webstudio-is/icons";
import { Flex } from "./flex";
import { Button } from "./button";
import { StorySection } from "./storybook";
import {
  DropdownMenu as DropdownMenuComponent,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuArrow,
} from "./dropdown-menu";

export default {
  title: "Dropdown Menu",
};

export const DropdownMenu = () => {
  const [bold, setBold] = useState(true);
  const [italic, setItalic] = useState(false);
  return (
    <StorySection title="Dropdown menu">
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
    </StorySection>
  );
};

export const WithIcons = () => (
  <StorySection title="With icons">
    <DropdownMenuComponent defaultOpen>
      <DropdownMenuTrigger asChild>
        <Button>With icons</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem icon={<CopyIcon />}>Copy</DropdownMenuItem>
        <DropdownMenuItem icon={<TrashIcon />} destructive>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenuComponent>
  </StorySection>
);

export const WithRadioGroup = () => {
  const [value, setValue] = useState("one");
  return (
    <StorySection title="With radio group">
      <DropdownMenuComponent defaultOpen>
        <DropdownMenuTrigger asChild>
          <Button>Radio group</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Choose one</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={value} onValueChange={setValue}>
            <DropdownMenuRadioItem value="one">
              Option one
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="two">
              Option two
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="three">
              Option three
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenuComponent>
    </StorySection>
  );
};

export const WithSubMenu = () => (
  <StorySection title="With sub menu">
    <DropdownMenuComponent defaultOpen>
      <DropdownMenuTrigger asChild>
        <Button>Sub menu</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Item one</DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>More options</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem>Sub item one</DropdownMenuItem>
            <DropdownMenuItem>Sub item two</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Item two</DropdownMenuItem>
        <DropdownMenuArrow />
      </DropdownMenuContent>
    </DropdownMenuComponent>
  </StorySection>
);
