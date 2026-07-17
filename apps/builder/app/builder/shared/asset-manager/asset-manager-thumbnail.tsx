import {
  forwardRef,
  type ComponentProps,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from "react";
import { ContextMenu, ContextMenuTrigger } from "@webstudio-is/design-system";
import { getAssetManagerDragKeyProps } from "./asset-manager-drag-preview";
import {
  AssetThumbnailCard,
  AssetThumbnailGroup,
  AssetThumbnailHeader,
  AssetThumbnailMenu,
} from "./asset-thumbnail-card";
import {
  AssetManagerItemActionsDropdown,
  AssetManagerItemContextMenuContent,
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
  ...cardProps
}: AssetManagerThumbnailProps) => {
  const { onClick, onKeyDown, onPointerDown, ...restCardProps } = cardProps;
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <AssetThumbnailGroup
          data-asset-manager-thumbnail=""
          role="option"
          aria-selected={forcedSelection ? selected : undefined}
          selected={selected}
          onFocusChange={onSelectionChange}
        >
          <AssetThumbnailCard
            {...restCardProps}
            {...getAssetManagerDragKeyProps(item)}
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
            onContextMenu={(event) => {
              onContextMenuSelection?.();
              event.currentTarget.focus();
            }}
          />
          {header !== undefined && (
            <AssetThumbnailHeader data-asset-thumbnail-header="">
              {header}
            </AssetThumbnailHeader>
          )}
        </AssetThumbnailGroup>
      </ContextMenuTrigger>
      <AssetManagerItemContextMenuContent actions={actions} />
    </ContextMenu>
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
