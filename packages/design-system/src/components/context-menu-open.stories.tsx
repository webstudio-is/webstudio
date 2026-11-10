import { useEffect, useRef, useState } from "react";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuLabel,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from "./context-menu";
import { MenuCheckedIcon } from "./menu";
import { Text } from "./text";
export default { title: "Context menu", component: ContextMenu };
export const Open = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [checked, setChecked] = useState(true);
  const [value, setValue] = useState("first");
  useEffect(() => {
    ref.current?.dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        clientX: 100,
        clientY: 70,
      })
    );
  }, []);
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div ref={ref} style={{ width: 240, height: 120 }}>
          <Text>Context menu</Text>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuLabel>Actions</ContextMenuLabel>
        <ContextMenuItem>Copy</ContextMenuItem>
        <ContextMenuItem disabled>Paste</ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>More</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem>Duplicate</ContextMenuItem>
            <ContextMenuItem disabled>Delete</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuCheckboxItem
          checked={checked}
          onCheckedChange={(v) => setChecked(v === true)}
        >
          Show guides
        </ContextMenuCheckboxItem>
        <ContextMenuRadioGroup value={value} onValueChange={setValue}>
          <ContextMenuRadioItem value="first" icon={<MenuCheckedIcon />}>
            First
          </ContextMenuRadioItem>
          <ContextMenuRadioItem value="second" icon={<MenuCheckedIcon />}>
            Second
          </ContextMenuRadioItem>
        </ContextMenuRadioGroup>
      </ContextMenuContent>
    </ContextMenu>
  );
};
