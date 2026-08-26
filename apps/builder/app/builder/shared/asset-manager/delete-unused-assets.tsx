import { atom } from "nanostores";
import { useStore } from "@nanostores/react";
import { useState } from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogClose,
  ScrollArea,
  Button,
  Text,
  Flex,
  theme,
  toast,
  Box,
  Checkbox,
  CheckboxAndLabel,
  Label,
} from "@webstudio-is/design-system";
import type { Asset } from "@webstudio-is/sdk";
import {
  $assets,
  $pages,
  $projectSettings,
  $props,
  $styles,
} from "~/shared/sync/data-stores";
import { deleteAssets } from "~/builder/shared/assets";
import { formatAssetName } from "@webstudio-is/project-build/runtime";
import { calculateUsagesByAssetId } from "@webstudio-is/project-build/runtime";

const $isDeleteUnusedAssetsDialogOpen = atom(false);

export const openDeleteUnusedAssetsDialog = () => {
  $isDeleteUnusedAssetsDialogOpen.set(true);
};

const DeleteUnusedAssetsDialogContent = ({
  onClose,
}: {
  onClose: () => void;
}) => {
  const assets = useStore($assets);
  const pages = useStore($pages);
  const projectSettings = useStore($projectSettings);
  const props = useStore($props);
  const styles = useStore($styles);
  const usagesByAssetId = calculateUsagesByAssetId({
    pages,
    projectSettings,
    props,
    styles,
    assets,
  });
  const unusedAssets: Asset[] = [];
  for (const asset of assets.values()) {
    const usages = usagesByAssetId.get(asset.id);
    if (usages === undefined || usages.length === 0) {
      unusedAssets.push(asset);
    }
  }
  const [selectedAssetIds, setSelectedAssetIds] = useState(
    () => new Set(unusedAssets.map((asset) => asset.id))
  );
  const selectedUnusedAssetIds = unusedAssets.flatMap((asset) =>
    selectedAssetIds.has(asset.id) ? [asset.id] : []
  );
  const allAssetsSelected =
    selectedUnusedAssetIds.length === unusedAssets.length;

  return (
    <>
      <Flex gap="3" direction="column" css={{ padding: theme.panel.padding }}>
        {unusedAssets.length === 0 ? (
          <DialogDescription asChild>
            <Text>There are no unused assets to delete.</Text>
          </DialogDescription>
        ) : (
          <>
            <DialogDescription asChild>
              <Text>
                Select which unused assets to delete from the project.
              </Text>
            </DialogDescription>

            <ScrollArea>
              <Box css={{ maxHeight: 200 }}>
                <Flex direction="column" gap="1">
                  {unusedAssets.map((asset) => (
                    <CheckboxAndLabel
                      key={asset.id}
                      css={{ overflow: "hidden" }}
                    >
                      <Checkbox
                        id={`unused-asset-${asset.id}`}
                        checked={selectedAssetIds.has(asset.id)}
                        onCheckedChange={(checked) => {
                          setSelectedAssetIds((currentAssetIds) => {
                            const nextAssetIds = new Set(currentAssetIds);
                            if (checked === true) {
                              nextAssetIds.add(asset.id);
                            } else {
                              nextAssetIds.delete(asset.id);
                            }
                            return nextAssetIds;
                          });
                        }}
                      />
                      <Label
                        htmlFor={`unused-asset-${asset.id}`}
                        text="mono"
                        truncate
                      >
                        {formatAssetName(asset)}
                      </Label>
                    </CheckboxAndLabel>
                  ))}
                </Flex>
              </Box>
            </ScrollArea>
          </>
        )}
      </Flex>
      <DialogActions>
        {unusedAssets.length > 0 && (
          <Button
            color="destructive"
            disabled={selectedUnusedAssetIds.length === 0}
            onClick={() => {
              const assetIds = selectedUnusedAssetIds;
              const count = assetIds.length;
              deleteAssets(assetIds, { force: false });
              onClose();
              toast.success(
                `Deleted ${count} unused ${count === 1 ? "asset" : "assets"}`
              );
            }}
            autoFocus
          >
            Delete
          </Button>
        )}
        <DialogClose>
          <Button color="ghost">
            {unusedAssets.length > 0 ? "Cancel" : "Close"}
          </Button>
        </DialogClose>
        {unusedAssets.length > 0 && (
          <Box css={{ marginRight: "auto" }}>
            <CheckboxAndLabel>
              <Checkbox
                id="select-all-unused-assets"
                checked={allAssetsSelected}
                onCheckedChange={() => {
                  setSelectedAssetIds(
                    allAssetsSelected
                      ? new Set()
                      : new Set(unusedAssets.map((asset) => asset.id))
                  );
                }}
              />
              <Label htmlFor="select-all-unused-assets">Select all</Label>
            </CheckboxAndLabel>
          </Box>
        )}
      </DialogActions>
    </>
  );
};

export const DeleteUnusedAssetsDialog = () => {
  const open = useStore($isDeleteUnusedAssetsDialogOpen);
  const handleClose = () => {
    $isDeleteUnusedAssetsDialogOpen.set(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (isOpen === false) {
          handleClose();
        }
      }}
    >
      <DialogContent
        width={400}
        onKeyDown={(event) => {
          event.stopPropagation();
        }}
      >
        <DialogTitle>Delete unused assets</DialogTitle>
        <DeleteUnusedAssetsDialogContent onClose={handleClose} />
      </DialogContent>
    </Dialog>
  );
};
