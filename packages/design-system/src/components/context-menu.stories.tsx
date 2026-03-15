import { useState } from "react";
import { Box } from "./box";
import { Text } from "./text";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuLabel,
  ContextMenuCheckboxItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from "./context-menu";
import { CopyIcon, TrashIcon, PlusIcon } from "@webstudio-is/icons";

export default {
  title: "Components/Context Menu",
  component: ContextMenu,
};

export const Demo = () => {
  const [bookmarked, setBookmarked] = useState(true);
  const [person, setPerson] = useState("pedro");

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <Box
          css={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 300,
            height: 150,
            border: "2px dashed currentColor",
            borderRadius: 8,
            userSelect: "none",
          }}
        >
          <Text>Right-click here</Text>
        </Box>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuLabel>Actions</ContextMenuLabel>
        <ContextMenuItem icon={<CopyIcon />}>Copy</ContextMenuItem>
        <ContextMenuItem icon={<PlusIcon />}>Add item</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuCheckboxItem
          checked={bookmarked}
          onCheckedChange={setBookmarked}
        >
          Bookmarked
        </ContextMenuCheckboxItem>
        <ContextMenuSeparator />
        <ContextMenuRadioGroup value={person} onValueChange={setPerson}>
          <ContextMenuLabel>People</ContextMenuLabel>
          <ContextMenuRadioItem value="pedro">Pedro</ContextMenuRadioItem>
          <ContextMenuRadioItem value="colm">Colm</ContextMenuRadioItem>
        </ContextMenuRadioGroup>
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger>More actions</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem>Save as…</ContextMenuItem>
            <ContextMenuItem>Export</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem icon={<TrashIcon />}>Delete</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
