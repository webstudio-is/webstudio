import { useStore } from "@nanostores/react";
import {
  Box,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  Flex,
  theme,
} from "@webstudio-is/design-system";
import { BoxIcon } from "@webstudio-is/icons";
import { $scale } from "~/builder/shared/nano-states";
import {
  $newEditableChildAnchor,
  $newEditableChildBlockTemplates,
  $newEditableChildRect,
  $newEditableChildTemplateInstanceId,
} from "~/shared/nano-states";
import { applyScale } from "./outline";

const DropDownMenu = ({
  triggerRect,
  onClose,
  menuItems,
}: {
  triggerRect: { top: number; left: number; width: number; height: number };
  onClose: () => void;
  menuItems: { icon: JSX.Element; title: string; id: string }[];
}) => {
  return (
    <DropdownMenu open={true} onOpenChange={onClose} modal>
      <DropdownMenuTrigger
        style={{
          position: "absolute",
          top: triggerRect.top,
          left: triggerRect.left,
          width: triggerRect.width,
          height: triggerRect.height,
          visibility: "hidden",
        }}
      />

      <DropdownMenuPortal>
        <DropdownMenuContent
          align="start"
          sideOffset={4}
          collisionPadding={16}
          side="top"
          loop
        >
          <DropdownMenuRadioGroup value={"1"} onValueChange={(_value) => {}}>
            {menuItems.map(({ icon, title, id }) => (
              <DropdownMenuRadioItem
                key={id}
                value={id}
                onFocus={() => {
                  $newEditableChildTemplateInstanceId.set(id);
                }}
                onBlur={() => {
                  // @todo delay
                  $newEditableChildTemplateInstanceId.set(undefined);
                }}
              >
                <Flex
                  css={{ py: theme.spacing[4], px: theme.spacing[5] }}
                  gap={2}
                >
                  {icon}
                  <Box>{title}</Box>
                </Flex>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
};

export const EditableBlockChildMenu = () => {
  const newEditableChildRect = useStore($newEditableChildRect);
  const scale = useStore($scale);
  const newEditableChildBlockTemplates = useStore(
    $newEditableChildBlockTemplates
  );

  if (newEditableChildRect === undefined) {
    return null;
  }

  if (newEditableChildBlockTemplates === undefined) {
    return null;
  }

  // Show menu at the top of the new editable child
  const topRect = {
    left: newEditableChildRect.left,
    top: newEditableChildRect.top,
    width: newEditableChildRect.width,
    height: 0,
  };

  const rect = applyScale(topRect, scale);

  const menuItems = newEditableChildBlockTemplates
    .filter((template) => template !== undefined)
    .map((template) => ({
      icon: <BoxIcon />,
      title: template.label ?? template.component,
      id: template.id,
    }));

  return (
    <DropDownMenu
      triggerRect={rect}
      menuItems={menuItems}
      onClose={() => {
        $newEditableChildRect.set(undefined);
        $newEditableChildAnchor.set(undefined);
        // force recalc of collapsed state
      }}
    />
  );
};
