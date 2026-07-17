import {
  forwardRef,
  type ComponentProps,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from "react";
import { getAssetManagerDragKeyProps } from "./asset-manager-drag-preview";
import {
  AssetThumbnailCard,
  AssetThumbnailGroup,
  AssetThumbnailHeader,
  AssetThumbnailMenu,
} from "./asset-thumbnail-card";
import {
  AssetManagerItemActionsDropdown,
  type AssetManagerItemActions,
} from "./asset-manager-item-menu";
import type { AssetManagerSelection } from "./asset-manager-selection";

export type AssetManagerThumbnailInteractions = {
  onSelectionChange: (item: AssetManagerSelection, selected: boolean) => void;
  onItemPointerDown: (
    item: AssetManagerSelection,
    event: PointerEvent<HTMLElement>
  ) => void;
  onItemClick: (
    item: AssetManagerSelection,
    event: MouseEvent<HTMLElement>
  ) => void;
  onModifiedArrow: (
    item: AssetManagerSelection,
    event: KeyboardEvent<HTMLElement>
  ) => void;
  onExitMultiselect?: () => void;
  onContextMenuSelection: (item: AssetManagerSelection) => void;
  onContextMenuActions: (actions: AssetManagerItemActions) => void;
  getDragItems: (item: AssetManagerSelection) => AssetManagerSelection[];
};

type AssetManagerThumbnailProps = Omit<
  ComponentProps<typeof AssetThumbnailCard>,
  "aria-pressed" | "as" | "onContextMenu" | "ref" | "selected" | "type"
> & {
  actions: AssetManagerItemActions;
  interactions: AssetManagerThumbnailInteractions;
  item: AssetManagerSelection;
  header?: ReactNode;
  selected?: boolean;
  forcedSelection?: boolean;
  thumbnailRef?: Ref<HTMLElement>;
};

export const AssetManagerThumbnail = ({
  actions,
  interactions,
  item,
  header,
  selected,
  forcedSelection = false,
  thumbnailRef,
  ...cardProps
}: AssetManagerThumbnailProps) => {
  const { onClick, onKeyDown, onPointerDown, ...restCardProps } = cardProps;
  return (
    <AssetThumbnailGroup
      data-asset-manager-thumbnail=""
      role="option"
      aria-selected={forcedSelection ? selected : undefined}
      selected={selected}
      onFocusChange={(selected) =>
        interactions.onSelectionChange(item, selected)
      }
      onContextMenu={(event) => {
        interactions.onContextMenuSelection(item);
        interactions.onContextMenuActions(actions);
        event.currentTarget
          .querySelector<HTMLElement>("[data-asset-manager-thumbnail-button]")
          ?.focus();
      }}
    >
      <AssetThumbnailCard
        {...restCardProps}
        {...getAssetManagerDragKeyProps(item)}
        data-asset-manager-thumbnail-button=""
        ref={thumbnailRef}
        as="button"
        type="button"
        selected={selected}
        onPointerDown={(event) => {
          onPointerDown?.(event);
          if (event.defaultPrevented === false) {
            interactions.onItemPointerDown(item, event);
          }
        }}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented === false) {
            interactions.onItemClick(item, event);
          }
        }}
        onKeyDown={(event) => {
          if (
            (event.shiftKey || event.metaKey || event.ctrlKey) &&
            ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
              event.key
            )
          ) {
            interactions.onModifiedArrow(item, event);
          } else if (
            event.key === "Escape" &&
            interactions.onExitMultiselect !== undefined
          ) {
            event.preventDefault();
            event.stopPropagation();
            interactions.onExitMultiselect();
          }
          if (event.defaultPrevented === false) {
            onKeyDown?.(event);
          }
        }}
      />
      {header !== undefined && (
        <AssetThumbnailHeader data-asset-thumbnail-header="">
          {header}
        </AssetThumbnailHeader>
      )}
    </AssetThumbnailGroup>
  );
};

type AssetManagerThumbnailMenuProps = {
  actions: AssetManagerItemActions;
  label: string;
  onPointerDown?: () => void;
};

export const AssetManagerThumbnailMenu = forwardRef<
  HTMLDivElement,
  AssetManagerThumbnailMenuProps
>(({ actions, label, onPointerDown }, ref) => (
  <AssetThumbnailMenu ref={ref} onPointerDown={onPointerDown}>
    <AssetManagerItemActionsDropdown
      actions={actions}
      triggerLabel={label}
      triggerTabIndex={-1}
    />
  </AssetThumbnailMenu>
));
AssetManagerThumbnailMenu.displayName = "AssetManagerThumbnailMenu";
