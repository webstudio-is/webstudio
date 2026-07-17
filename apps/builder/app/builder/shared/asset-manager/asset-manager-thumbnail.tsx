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

type AssetManagerThumbnailProps = Omit<
  ComponentProps<typeof AssetThumbnailCard>,
  "aria-pressed" | "as" | "onContextMenu" | "ref" | "selected" | "type"
> & {
  actions: AssetManagerItemActions;
  item: AssetManagerSelection;
  header?: ReactNode;
  selected?: boolean;
  forcedSelection?: boolean;
  thumbnailRef?: Ref<HTMLElement>;
  onSelectionChange: (selected: boolean) => void;
  onItemPointerDown?: (event: PointerEvent<HTMLElement>) => void;
  onItemClick?: (event: MouseEvent<HTMLElement>) => void;
  onModifiedArrow?: (event: KeyboardEvent<HTMLElement>) => void;
  onExitMultiselect?: () => void;
  onContextMenuSelection?: () => void;
  onContextMenuActions?: (actions: AssetManagerItemActions) => void;
};

export const AssetManagerThumbnail = ({
  actions,
  item,
  header,
  selected,
  forcedSelection = false,
  thumbnailRef,
  onSelectionChange,
  onItemPointerDown,
  onItemClick,
  onModifiedArrow,
  onExitMultiselect,
  onContextMenuSelection,
  onContextMenuActions,
  ...cardProps
}: AssetManagerThumbnailProps) => {
  const { onClick, onKeyDown, onPointerDown, ...restCardProps } = cardProps;
  return (
    <AssetThumbnailGroup
      data-asset-manager-thumbnail=""
      role="option"
      aria-selected={forcedSelection ? selected : undefined}
      selected={selected}
      onFocusChange={onSelectionChange}
      onContextMenu={(event) => {
        onContextMenuSelection?.();
        onContextMenuActions?.(actions);
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
            onItemPointerDown?.(event);
          }
        }}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented === false) {
            onItemClick?.(event);
          }
        }}
        onKeyDown={(event) => {
          if (
            (event.shiftKey || event.metaKey || event.ctrlKey) &&
            ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
              event.key
            )
          ) {
            onModifiedArrow?.(event);
          } else if (
            event.key === "Escape" &&
            onExitMultiselect !== undefined
          ) {
            event.preventDefault();
            event.stopPropagation();
            onExitMultiselect?.();
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
