import { useStore } from "@nanostores/react";
import {
  $editableBlockChildOutline,
  $instances,
  $isContentMode,
  type EditableBlockChildOutline,
} from "~/shared/nano-states";
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
  IconButton,
  Tooltip,
  toast,
} from "@webstudio-is/design-system";
import { EditableBlockChildAddButtonOutline } from "./outline";
import { applyScale } from "./apply-scale";
import { $scale } from "~/builder/shared/nano-states";
import { BoxIcon, PlusIcon } from "@webstudio-is/icons";
import { useRef, useState } from "react";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import type { InstanceSelector } from "~/shared/tree-utils";
import type { Instance } from "@webstudio-is/sdk";
import {
  editableBlockComponent,
  editableBlockTemplateComponent,
} from "@webstudio-is/react-sdk";

const findEditableBlockSelector = (
  anchor: InstanceSelector,
  instances: Map<string, Instance>
) => {
  if (anchor === undefined) {
    return;
  }

  if (anchor.length === 0) {
    return undefined;
  }

  let editableBlockInstanceSelector: InstanceSelector | undefined = undefined;

  for (let i = 0; i < anchor.length; ++i) {
    const instanceId = anchor[i];

    const instance = instances.get(instanceId);
    if (instance === undefined) {
      return;
    }

    if (instance.component === editableBlockComponent) {
      editableBlockInstanceSelector = anchor.slice(i);
      break;
    }
  }

  if (editableBlockInstanceSelector === undefined) {
    return;
  }

  return editableBlockInstanceSelector;
};

const findTemplates = (
  anchor: InstanceSelector,
  instances: Map<string, Instance>
) => {
  const editableBlockInstanceSelector = findEditableBlockSelector(
    anchor,
    instances
  );
  if (editableBlockInstanceSelector === undefined) {
    toast.error("Editable block not found");
    return;
  }

  const editableBlockInstance = instances.get(editableBlockInstanceSelector[0]);

  if (editableBlockInstance === undefined) {
    toast.error("Editable block instance not found");
    return;
  }

  const templateInstanceId = editableBlockInstance.children.find(
    (child) =>
      child.type === "id" &&
      instances.get(child.value)?.component === editableBlockTemplateComponent
  )?.value;

  if (templateInstanceId === undefined) {
    toast.error("Templates instance id not found");
    return;
  }

  const templateInstance = instances.get(templateInstanceId);

  if (templateInstance === undefined) {
    toast.error("Templates instance not found");
    return;
  }

  return templateInstance.children
    .filter((child) => child.type === "id")
    .map((child) => child.value)
    .map((childId) => instances.get(childId))
    .filter((child) => child !== undefined);
};

const TemplatesMenu = ({
  onOpenChange,
  children,
  anchor,
}: {
  children: React.ReactNode;
  onOpenChange: (open: boolean) => void;
  anchor: InstanceSelector;
}) => {
  const instances = useStore($instances);
  const templates = findTemplates(anchor, instances);

  const menuItems = (templates ?? []).map((template) => ({
    id: template.id,
    icon: <BoxIcon />,
    title: template.label ?? template.component,
  }));

  return (
    <DropdownMenu onOpenChange={onOpenChange} modal>
      <Tooltip content="Add next block" side="top" disableHoverableContent>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      </Tooltip>

      <DropdownMenuPortal>
        <DropdownMenuContent
          align="start"
          sideOffset={4}
          collisionPadding={16}
          side="bottom"
          loop
        >
          <DropdownMenuRadioGroup
            onValueChange={(_value) => {
              // console.log("value", _value);
            }}
          >
            {menuItems.map(({ icon, title, id }) => (
              <DropdownMenuRadioItem key={id} value={id}>
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

export const EditableBlockChildHoveredInstanceOutline = () => {
  const editableBlockChildOutline = useStore($editableBlockChildOutline);
  const scale = useStore($scale);
  const isContentMode = useStore($isContentMode);

  const timeoutRef = useRef<undefined | ReturnType<typeof setTimeout>>(
    undefined
  );
  const [buttonOutline, setButtonOutline] = useState<
    undefined | EditableBlockChildOutline
  >(undefined);

  const outline = editableBlockChildOutline ?? buttonOutline;

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (isFeatureEnabled("contentEditableMode") === false) {
    return;
  }

  if (!isContentMode) {
    return;
  }

  if (outline === undefined) {
    return;
  }

  const rect = applyScale(outline.rect, scale);

  return (
    <EditableBlockChildAddButtonOutline rect={rect}>
      <TemplatesMenu
        onOpenChange={(open) => {
          setIsMenuOpen(open);

          if (!open) {
            setButtonOutline(undefined);
          }
        }}
        anchor={outline.selector}
      >
        <IconButton
          variant={"local"}
          css={{
            borderStyle: "solid",
            borderColor: `oklch(from ${theme.colors.backgroundPrimary} l c h / 0.7)`,
            borderRadius: "100%",
            pointerEvents: isMenuOpen ? "none" : "all",
          }}
          onMouseEnter={() => {
            clearTimeout(timeoutRef.current);

            setButtonOutline(outline);
          }}
          onMouseLeave={() => {
            if (isMenuOpen) {
              return;
            }

            clearTimeout(timeoutRef.current);

            timeoutRef.current = setTimeout(() => {
              setButtonOutline(undefined);
            }, 100);
          }}
        >
          <PlusIcon />
        </IconButton>
      </TemplatesMenu>
    </EditableBlockChildAddButtonOutline>
  );
};
