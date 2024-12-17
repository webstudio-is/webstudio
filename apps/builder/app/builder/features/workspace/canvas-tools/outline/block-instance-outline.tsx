import { useStore } from "@nanostores/react";
import {
  $blockChildOutline,
  $hoveredInstanceOutline,
  $hoveredInstanceSelector,
  $instances,
  $isContentMode,
  $modifierKeys,
  $registeredComponentMetas,
  type BlockChildOutline,
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
  Kbd,
  Text,
  Grid,
  DropdownMenuSeparator,
  menuItemCss,
} from "@webstudio-is/design-system";
import { Outline } from "./outline";
import { applyScale } from "./apply-scale";
import { $clampingRect, $scale } from "~/builder/shared/nano-states";
import { PlusIcon, TrashIcon } from "@webstudio-is/icons";
import { BoxIcon } from "@webstudio-is/icons/svg";
import { useRef, useState } from "react";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import type { DroppableTarget, InstanceSelector } from "~/shared/tree-utils";
import type { Instance, Instances } from "@webstudio-is/sdk";
import {
  blockComponent,
  blockTemplateComponent,
} from "@webstudio-is/react-sdk";
import {
  deleteInstanceMutable,
  extractWebstudioFragment,
  findAvailableDataSources,
  getWebstudioData,
  insertInstanceChildrenMutable,
  insertWebstudioFragmentCopy,
  updateWebstudioData,
} from "~/shared/instance-utils";
import { shallowEqual } from "shallow-equal";
import { MetaIcon } from "~/builder/shared/meta-icon";
import { skipInertHandlersAttribute } from "~/builder/shared/inert-handlers";
import { selectInstance } from "~/shared/awareness";

export const findBlockSelector = (
  anchor: InstanceSelector,
  instances: Instances
) => {
  if (anchor === undefined) {
    return;
  }

  if (anchor.length === 0) {
    return;
  }

  let blockInstanceSelector: InstanceSelector | undefined = undefined;

  for (let i = 0; i < anchor.length; ++i) {
    const instanceId = anchor[i];

    const instance = instances.get(instanceId);
    if (instance === undefined) {
      return;
    }

    if (instance.component === blockComponent) {
      blockInstanceSelector = anchor.slice(i);
      break;
    }
  }

  if (blockInstanceSelector === undefined) {
    return;
  }

  return blockInstanceSelector;
};

const findTemplates = (anchor: InstanceSelector, instances: Instances) => {
  const blockInstanceSelector = findBlockSelector(anchor, instances);
  if (blockInstanceSelector === undefined) {
    return;
  }

  const blockInstance = instances.get(blockInstanceSelector[0]);

  if (blockInstance === undefined) {
    return;
  }

  const templateInstanceId = blockInstance.children.find(
    (child) =>
      child.type === "id" &&
      instances.get(child.value)?.component === blockTemplateComponent
  )?.value;

  if (templateInstanceId === undefined) {
    return;
  }

  const templateInstance = instances.get(templateInstanceId);

  if (templateInstance === undefined) {
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
        [child.id, templateInstanceId, ...blockInstanceSelector],
      ]);

  return result;
};

const getInsertionIndex = (
  anchor: InstanceSelector,
  instances: Instances,
  insertBefore: boolean = false
) => {
  const blockSelector = findBlockSelector(anchor, instances);
  if (blockSelector === undefined) {
    return;
  }

  const insertAtInitialPosition = shallowEqual(blockSelector, anchor);

  const blockInstance = instances.get(blockSelector[0]);

  if (blockInstance === undefined) {
    return;
  }

  const index = blockInstance.children.findIndex((child) => {
    if (child.type !== "id") {
      return false;
    }

    if (insertAtInitialPosition) {
      return instances.get(child.value)?.component === blockTemplateComponent;
    }

    return child.value === anchor[0];
  });

  if (index === -1) {
    return;
  }

  // Independent of insertBefore, we always insert after the Templates instance
  if (insertAtInitialPosition) {
    return index + 1;
  }

  return insertBefore ? index : index + 1;
};

const TemplatesMenu = ({
  onOpenChange,
  open,
  children,
  anchor,
}: {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchor: InstanceSelector;
}) => {
  const instances = useStore($instances);
  const metas = useStore($registeredComponentMetas);
  const modifierKeys = useStore($modifierKeys);

  const blockInstanceSelector = findBlockSelector(anchor, instances);

  if (blockInstanceSelector === undefined) {
    return;
  }

  const blockInstance = instances.get(blockInstanceSelector[0]);

  if (blockInstance === undefined) {
    return;
  }

  // 1 child is Templates instance
  const hasChildren = blockInstance.children.length > 1;

  const templates = findTemplates(anchor, instances);

  const menuItems = templates?.map(([template, templateSelector]) => ({
    id: template.id,
    icon: <MetaIcon icon={metas.get(template.component)?.icon ?? BoxIcon} />,
    title: template.label ?? template.component,
    value: templateSelector,
  }));

  return (
    <DropdownMenu onOpenChange={onOpenChange} open={open} modal>
      {children}
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
              const insertBefore = modifierKeys.altKey;

              const templateSelector = JSON.parse(value) as InstanceSelector;
              const fragment = extractWebstudioFragment(
                getWebstudioData(),
                templateSelector[0]
              );

              const parentSelector = findBlockSelector(anchor, instances);

              if (parentSelector === undefined) {
                return;
              }

              const position = getInsertionIndex(
                anchor,
                instances,
                insertBefore
              );

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

                selectInstance([newRootInstanceId, ...target.parentSelector]);
              });
            }}
          >
            {menuItems?.map(({ icon, title, id, value }) => (
              <DropdownMenuRadioItem
                key={id}
                value={JSON.stringify(value)}
                {...{ [skipInertHandlersAttribute]: true }}
                data-yyy
              >
                <Flex css={{ px: theme.spacing[3] }} gap={2} data-xxx>
                  {icon}
                  <Box>{title}</Box>
                </Flex>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />

          <div className={menuItemCss({ hint: true })}>
            <Grid css={{ width: theme.spacing[25] }}>
              <Flex gap={1} css={{ display: hasChildren ? "none" : undefined }}>
                <Kbd value={["click"]} />
                <Text>to add before</Text>
              </Flex>

              <Flex
                gap={1}
                css={{
                  order: modifierKeys.altKey ? 2 : 0,
                  display: hasChildren ? undefined : "none",
                }}
              >
                <Kbd value={["click"]} />
                <Text>to add after</Text>
              </Flex>
              <Flex
                gap={1}
                css={{ order: 1, display: hasChildren ? undefined : "none" }}
              >
                <Kbd value={["option", "click"]} /> <Text>to add before</Text>
              </Flex>
            </Grid>
          </div>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
};

const distanceToButton = theme.spacing[4];

/**
 * The button's grace area must slightly overlap with the outline rectangle.
 * This is because the outline rectangle has `pointer-events: none`, and some UI elements, like resize handles, are placed above it.
 * The overlap ensures the grace area starts earlier to account for this.
 */
const graceAreaOverlap = theme.spacing[4];

export const BlockChildHoveredInstanceOutline = () => {
  const blockChildOutline = useStore($blockChildOutline);
  const scale = useStore($scale);
  const isContentMode = useStore($isContentMode);
  const modifierKeys = useStore($modifierKeys);
  const instances = useStore($instances);
  const clampingRect = useStore($clampingRect);

  const timeoutRef = useRef<undefined | ReturnType<typeof setTimeout>>(
    undefined
  );
  const [buttonOutline, setButtonOutline] = useState<
    undefined | BlockChildOutline
  >(undefined);

  const outline = blockChildOutline ?? buttonOutline;

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

  if (clampingRect === undefined) {
    return;
  }

  const blockInstanceSelector = findBlockSelector(outline.selector, instances);

  if (blockInstanceSelector === undefined) {
    return;
  }

  const blockInstance = instances.get(blockInstanceSelector[0]);

  if (blockInstance === undefined) {
    return;
  }

  const templates = findTemplates(outline.selector, instances);

  if (templates === undefined) {
    return;
  }

  if (templates.length === 0) {
    return;
  }

  // 1 child is Templates instance
  const hasChildren = blockInstance.children.length > 1;

  const rect = applyScale(outline.rect, scale);

  const isAddMode = isMenuOpen || !modifierKeys.altKey || !hasChildren;

  const tooltipContent = (
    <Grid>
      <Flex gap={1} css={{ order: isAddMode ? 0 : 2 }}>
        <Kbd value={["click"]} color="contrast" />
        <Text color="subtle">to add block</Text>
      </Flex>
      <Flex
        gap={1}
        css={{ order: 1, display: !hasChildren ? "none" : undefined }}
      >
        <Kbd value={["option", "click"]} color="contrast" />{" "}
        <Text color="subtle">to delete</Text>
      </Flex>
    </Grid>
  );

  return (
    <Outline rect={rect} clampingRect={clampingRect}>
      <div
        style={{
          width: 0,
          display: "grid",

          alignContent: "stretch",
          justifyContent: "end",
        }}
      >
        <Flex
          css={{
            // Define grace area for the button
            width: `calc(${theme.sizes.controlHeight} + ${distanceToButton} + ${graceAreaOverlap})`,
            marginRight: `-${graceAreaOverlap}`,
            pointerEvents: isMenuOpen ? "none" : "all",
            clipPath: `polygon(0% 0%, 100% 0%, 100% 100%, calc(100% - ${graceAreaOverlap}) 100%, 0% ${theme.sizes.controlHeight})`,
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
            open={isMenuOpen}
            onOpenChange={(open) => {
              if (!isAddMode) {
                return;
              }

              setIsMenuOpen(open);

              if (!open) {
                setButtonOutline(undefined);
              }
            }}
            anchor={outline.selector}
          >
            <Tooltip
              content={tooltipContent}
              side="top"
              disableHoverableContent
            >
              <DropdownMenuTrigger asChild>
                <IconButton
                  variant={isAddMode ? "local" : "overwritten"}
                  onClick={() => {
                    if (isAddMode) {
                      return;
                    }

                    updateWebstudioData((data) => {
                      deleteInstanceMutable(data, outline.selector);
                    });

                    setButtonOutline(undefined);
                    $blockChildOutline.set(undefined);
                    $hoveredInstanceSelector.set(undefined);
                    $hoveredInstanceOutline.set(undefined);
                  }}
                  css={{
                    borderStyle: "solid",
                    borderColor: isAddMode
                      ? `oklch(from ${theme.colors.backgroundPrimary} l c h / 0.7)`
                      : undefined,
                  }}
                >
                  {isAddMode ? <PlusIcon /> : <TrashIcon />}
                </IconButton>
              </DropdownMenuTrigger>
            </Tooltip>
          </TemplatesMenu>
        </Flex>
      </div>
    </Outline>
  );
};
