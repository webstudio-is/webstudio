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
  $newEditableChildRect,
} from "~/shared/nano-states";
import { applyScale } from "./outline";

const DropDownMenu = ({
  triggerRect,
  onClose,
}: {
  triggerRect: { top: number; left: number; width: number; height: number };
  onClose: () => void;
}) => {
  const menuItems = [
    {
      icon: <BoxIcon />,
      title: "Preview",
      id: "1",
    },
    {
      icon: <BoxIcon />,
      title: "Design",
      id: "2",
    },
    {
      icon: <BoxIcon />,
      title: "Build",
      id: "3",
    },
  ];

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
          side="bottom"
          loop
        >
          <DropdownMenuRadioGroup value={"1"} onValueChange={(_value) => {}}>
            {menuItems.map(({ icon, title, id }) => (
              <DropdownMenuRadioItem
                key={id}
                value={id}
                // onFocus={handleFocus(id)}
                // onBlur={handleBlur}
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

  if (newEditableChildRect === undefined) {
    return null;
  }

  const rect = applyScale(newEditableChildRect, scale);

  return (
    <DropDownMenu
      triggerRect={rect}
      onClose={() => {
        $newEditableChildRect.set(undefined);
        $newEditableChildAnchor.set(undefined);
      }}
    />
  );
};
