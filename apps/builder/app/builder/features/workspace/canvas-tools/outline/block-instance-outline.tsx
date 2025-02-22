import { useStore } from "@nanostores/react";
import {
  $blockChildOutline,
  $hoveredInstanceOutline,
  $hoveredInstanceSelector,
  $instances,
  $isContentMode,
  $modifierKeys,
  $registeredComponentMetas,
  findBlockSelector,
  findTemplates,
  type BlockChildOutline,
} from "~/shared/nano-states";
import {
  Box,
  DropdownMenu,
  DropdownMenuContent,
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
import type { InstanceSelector } from "~/shared/tree-utils";
import type { Instance } from "@webstudio-is/sdk";

import {
  deleteInstanceMutable,
  updateWebstudioData,
} from "~/shared/instance-utils";

import { MetaIcon } from "~/builder/shared/meta-icon";
import { skipInertHandlersAttribute } from "~/builder/shared/inert-handlers";

import { insertTemplateAt } from "./block-utils";
import { useEffectEvent } from "~/shared/hook-utils/effect-event";
import { getInstancePath } from "~/shared/awareness";

export const TemplatesMenu = ({
  onOpenChange,
  open,
  children,
  anchor,
  triggerTooltipContent,
  templates,
  value,
  onValueChangeComplete,
  onValueChange,
  modal,
  inert,
  preventFocusOnHover,
}: {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchor: InstanceSelector;
  triggerTooltipContent: JSX.Element;
  templates: [instance: Instance, instanceSelector: InstanceSelector][];
  value: InstanceSelector | undefined;
  onValueChangeComplete: (value: InstanceSelector) => void;
  onValueChange?: undefined | ((value: InstanceSelector | undefined) => void);
  modal: boolean;
  inert: boolean;
  preventFocusOnHover: boolean;
}) => {
  const instances = useStore($instances);
  const metas = useStore($registeredComponentMetas);
  const modifierKeys = useStore($modifierKeys);

  const blockInstanceSelector = findBlockSelector(anchor, instances);

  const handleValueChangeComplete = useEffectEvent((value: string) => {
    const templateSelector = JSON.parse(value) as InstanceSelector;
    onValueChangeComplete(templateSelector);
  });

  const handleValueChange = useEffectEvent(
    (value: InstanceSelector | undefined) => {
      onValueChange?.(value);
    }
  );

  if (blockInstanceSelector === undefined) {
    return;
  }

  const blockInstance = instances.get(blockInstanceSelector[0]);

  if (blockInstance === undefined) {
    return;
  }

  // 1 child is Templates instance
  const hasChildren = blockInstance.children.length > 1;

  const menuItems = templates?.map(([template, templateSelector]) => ({
    id: template.id,
    icon: <MetaIcon icon={metas.get(template.component)?.icon ?? BoxIcon} />,
    title: template.label ?? template.component,
    value: templateSelector,
  }));

  return (
    <DropdownMenu onOpenChange={onOpenChange} open={open} modal={modal}>
      <Tooltip
        content={triggerTooltipContent}
        side="top"
        disableHoverableContent
      >
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      </Tooltip>
      <DropdownMenuContent
        align="start"
        sideOffset={4}
        collisionPadding={16}
        side="bottom"
        loop
        // @todo remove inert after creation
        {...(inert ? { inert: "" } : {})}
      >
        {templates.length > 0 ? (
          <>
            <DropdownMenuRadioGroup
              value={value !== undefined ? JSON.stringify(value) : value}
              onValueChange={handleValueChangeComplete}
            >
              {menuItems?.map((item) => (
                <DropdownMenuRadioItem
                  aria-selected={
                    JSON.stringify(item.value) === JSON.stringify(value)
                  }
                  onPointerEnter={() => {
                    handleValueChange(value);
                  }}
                  onPointerMove={
                    preventFocusOnHover
                      ? (e) => {
                          e.preventDefault();
                        }
                      : undefined
                  }
                  onPointerLeave={
                    preventFocusOnHover
                      ? (e) => {
                          handleValueChange(undefined);
                          e.preventDefault();
                        }
                      : undefined
                  }
                  onPointerDown={
                    preventFocusOnHover
                      ? (event) => {
                          event.preventDefault();
                        }
                      : undefined
                  }
                  key={item.id}
                  value={JSON.stringify(item.value)}
                  {...{ [skipInertHandlersAttribute]: true }}
                >
                  <Flex css={{ px: theme.spacing[3] }} gap={2} data-xxx>
                    {item.icon}
                    <Box>{item.title}</Box>
                  </Flex>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <div className={menuItemCss({ hint: true })}>
              <Grid css={{ width: theme.spacing[25] }}>
                <Flex
                  gap={1}
                  css={{ display: hasChildren ? "none" : undefined }}
                >
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
                  css={{
                    order: 1,
                    display: hasChildren ? undefined : "none",
                  }}
                >
                  <Kbd value={["alt", "click"]} /> <Text>to add before</Text>
                </Flex>
              </Grid>
            </div>
          </>
        ) : (
          <div className={menuItemCss({ hint: true })}>
            <Grid css={{ width: theme.spacing[25] }}>
              <Text>No Results</Text>
            </Grid>
          </div>
        )}
      </DropdownMenuContent>
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
        <Kbd value={["alt", "click"]} color="contrast" />{" "}
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
            triggerTooltipContent={tooltipContent}
            templates={templates}
            onValueChangeComplete={(templateSelector) => {
              const insertBefore = modifierKeys.altKey;
              insertTemplateAt(
                templateSelector,
                outline.selector,
                insertBefore
              );
            }}
            value={undefined}
            modal={true}
            inert={false}
            preventFocusOnHover={false}
          >
            <IconButton
              variant={isAddMode ? "local" : "overwritten"}
              onClick={() => {
                if (isAddMode) {
                  return;
                }

                updateWebstudioData((data) => {
                  deleteInstanceMutable(
                    data,
                    getInstancePath(outline.selector, data.instances)
                  );
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
          </TemplatesMenu>
        </Flex>
      </div>
    </Outline>
  );
};
