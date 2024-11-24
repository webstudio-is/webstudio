import { useStore } from "@nanostores/react";
import {
  $editableBlockChildOutline,
  $hoveredInstanceOutlineAndInstance,
  $hoveredInstanceSelector,
  $instances,
  $isContentMode,
  $textEditingInstanceSelector,
  type EditableBlockChildOutline,
} from "~/shared/nano-states";
import { EditableBlockChildAddButtonOutline, Outline } from "./outline";
import { Label } from "./label";
import { applyScale } from "./apply-scale";
import { $scale } from "~/builder/shared/nano-states";
import { findClosestSlot } from "~/shared/instance-utils";
import { shallowEqual } from "shallow-equal";
import type { InstanceSelector } from "~/shared/tree-utils";
import { IconButton, theme, Tooltip } from "@webstudio-is/design-system";
import { PlusIcon } from "@webstudio-is/icons";
import { useRef, useState } from "react";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";

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
      <Tooltip content="Add next block" side="top" disableHoverableContent>
        <IconButton
          variant={"local"}
          css={{
            borderStyle: "solid",
            borderColor: `oklch(from ${theme.colors.backgroundPrimary} l c h / 0.7)`,
            borderRadius: "100%",
            pointerEvents: "all",
            // mr: theme.spacing[12],
          }}
          onClick={() => {
            alert("not implemented");
          }}
          onMouseEnter={() => {
            clearTimeout(timeoutRef.current);

            setButtonOutline(outline);
          }}
          onMouseLeave={() => {
            clearTimeout(timeoutRef.current);

            timeoutRef.current = setTimeout(() => {
              setButtonOutline(undefined);
            }, 100);
          }}
        >
          <PlusIcon />
        </IconButton>
      </Tooltip>
    </EditableBlockChildAddButtonOutline>
  );
};

const isDescendantOrSelf = (
  descendant: InstanceSelector,
  self: InstanceSelector
) => {
  return descendant.join(",").endsWith(self.join(","));
};

export const HoveredInstanceOutline = () => {
  const instances = useStore($instances);
  const hoveredInstanceSelector = useStore($hoveredInstanceSelector);
  const editableBlockChildOutline = useStore($editableBlockChildOutline);
  const outline = useStore($hoveredInstanceOutlineAndInstance);
  const scale = useStore($scale);
  const textEditingInstanceSelector = useStore($textEditingInstanceSelector);
  const isContentMode = useStore($isContentMode);

  if (outline === undefined || hoveredInstanceSelector === undefined) {
    return;
  }

  if (isFeatureEnabled("contentEditableMode") && isContentMode) {
    if (
      shallowEqual(editableBlockChildOutline?.selector, hoveredInstanceSelector)
    ) {
      return;
    }
  }

  if (
    textEditingInstanceSelector?.selector &&
    isDescendantOrSelf(
      hoveredInstanceSelector,
      textEditingInstanceSelector?.selector
    )
  ) {
    return;
  }

  const variant = findClosestSlot(instances, hoveredInstanceSelector)
    ? "slot"
    : "default";
  const rect = applyScale(outline.rect, scale);

  return (
    <Outline rect={rect} variant={variant}>
      <Label
        variant={variant}
        instance={outline.instance}
        instanceRect={rect}
      />
    </Outline>
  );
};
