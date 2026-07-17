import {
  forwardRef,
  type ComponentProps,
  type ReactNode,
  type Ref,
} from "react";
import { ContextMenu, ContextMenuTrigger } from "@webstudio-is/design-system";
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

type AssetManagerThumbnailProps = Omit<
  ComponentProps<typeof AssetThumbnailCard>,
  "aria-pressed" | "as" | "onContextMenu" | "ref" | "selected" | "type"
> & {
  actions: AssetManagerItemActions;
  header?: ReactNode;
  selected?: boolean;
  thumbnailRef?: Ref<HTMLElement>;
  onSelectionChange: (selected: boolean) => void;
};

export const AssetManagerThumbnail = ({
  actions,
  header,
  selected,
  thumbnailRef,
  onSelectionChange,
  ...cardProps
}: AssetManagerThumbnailProps) => (
  <ContextMenu>
    <ContextMenuTrigger asChild>
      <AssetThumbnailGroup
        data-asset-manager-thumbnail=""
        selected={selected}
        onFocusChange={onSelectionChange}
      >
        <AssetThumbnailCard
          {...cardProps}
          ref={thumbnailRef}
          as="button"
          type="button"
          aria-pressed={selected}
          selected={selected}
          onContextMenu={(event) => event.currentTarget.focus()}
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

type AssetManagerThumbnailMenuProps = {
  actions: AssetManagerItemActions;
  label: string;
};

const hiddenThumbnailActions = new Set(["rename"] as const);

export const AssetManagerThumbnailMenu = forwardRef<
  HTMLDivElement,
  AssetManagerThumbnailMenuProps
>(({ actions, label }, ref) => (
  <AssetThumbnailMenu ref={ref}>
    <AssetManagerItemActionsDropdown
      actions={actions}
      hiddenActions={hiddenThumbnailActions}
      triggerLabel={label}
      triggerTabIndex={-1}
    />
  </AssetThumbnailMenu>
));
AssetManagerThumbnailMenu.displayName = "AssetManagerThumbnailMenu";
