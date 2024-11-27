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
import type { DroppableTarget, InstanceSelector } from "~/shared/tree-utils";
import type { Instance, Instances } from "@webstudio-is/sdk";
import {
  editableBlockComponent,
  editableBlockTemplateComponent,
} from "@webstudio-is/react-sdk";
import {
  extractWebstudioFragment,
  findAvailableDataSources,
  getWebstudioData,
  insertInstanceChildrenMutable,
  insertWebstudioFragmentCopy,
  updateWebstudioData,
} from "~/shared/instance-utils";
import { shallowEqual } from "shallow-equal";

const findEditableBlockSelector = (
  anchor: InstanceSelector,
  instances: Instances
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

const findTemplates = (anchor: InstanceSelector, instances: Instances) => {
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

  const result: [instance: Instance, instanceSelector: InstanceSelector][] =
    templateInstance.children
      .filter((child) => child.type === "id")
      .map((child) => child.value)
      .map((childId) => instances.get(childId))
      .filter((child) => child !== undefined)
      .map((child) => [
        child,
        [child.id, templateInstanceId, ...editableBlockInstanceSelector],
      ]);

  return result;
};

const getInsertionIndex = (anchor: InstanceSelector, instances: Instances) => {
  const editableBlockSelector = findEditableBlockSelector(anchor, instances);
  if (editableBlockSelector === undefined) {
    return;
  }

  const insertAtInitialPosition = shallowEqual(editableBlockSelector, anchor);

  const editableBlockInstance = instances.get(editableBlockSelector[0]);

  if (editableBlockInstance === undefined) {
    toast.error("Editable block instance not found");
    return;
  }

  let index = editableBlockInstance.children.findIndex((child) => {
    if (child.type !== "id") {
      return false;
    }

    if (insertAtInitialPosition) {
      return (
        instances.get(child.value)?.component === editableBlockTemplateComponent
      );
    }

    return child.value === anchor[0];
  });

  if (index === -1) {
    return;
  }
  index += 1;

  return index;
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

  const menuItems = templates?.map(([template, templateSelector]) => ({
    id: template.id,
    icon: <BoxIcon />,
    title: template.label ?? template.component,
    value: templateSelector,
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
            onValueChange={(value) => {
              const templateSelector = JSON.parse(value) as InstanceSelector;
              const fragment = extractWebstudioFragment(
                getWebstudioData(),
                templateSelector[0]
              );

              const parentSelector = findEditableBlockSelector(
                anchor,
                instances
              );

              if (parentSelector === undefined) {
                return;
              }

              const position = getInsertionIndex(anchor, instances);

              if (position === undefined) {
                return;
              }

              const target: DroppableTarget = {
                parentSelector,
                position,
              };

              updateWebstudioData((data) => {
                const { newInstanceIds } = insertWebstudioFragmentCopy({
                  data,
                  fragment,
                  availableDataSources: findAvailableDataSources(
                    data.dataSources,
                    data.instances,
                    target.parentSelector
                  ),
                });
                const newRootInstanceId = newInstanceIds.get(
                  fragment.instances[0].id
                );
                if (newRootInstanceId === undefined) {
                  return;
                }
                const children: Instance["children"] = [
                  { type: "id", value: newRootInstanceId },
                ];
                insertInstanceChildrenMutable(data, children, target);
              });
            }}
          >
            {menuItems?.map(({ icon, title, id, value }) => (
              <DropdownMenuRadioItem key={id} value={JSON.stringify(value)}>
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
      <Flex
        css={{
          width: "min-content",
          height: "min-content",
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
            }}
          >
            <PlusIcon />
          </IconButton>
        </TemplatesMenu>
        <Box
          css={{
            width: theme.spacing[4],
            // For easier hover
            height: theme.spacing[12],
          }}
        ></Box>
      </Flex>
    </EditableBlockChildAddButtonOutline>
  );
};
