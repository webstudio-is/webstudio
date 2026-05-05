import { atom } from "nanostores";
import { useStore } from "@nanostores/react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  DialogClose,
  ScrollArea,
  Button,
  Text,
  Flex,
  theme,
  toast,
  Box,
} from "@webstudio-is/design-system";
import type { Asset } from "@webstudio-is/sdk";
import { $assets, $pages, $props, $styles } from "~/shared/sync/data-stores";
import { deleteAssets } from "~/builder/shared/assets";
import { formatAssetName } from "~/builder/shared/assets/asset-utils";
import { calculateUsagesByAssetId } from "./asset-info";

const $isDeleteUnusedAssetsDialogOpen = atom(false);

export const openDeleteUnusedAssetsDialog = () => {
  $isDeleteUnusedAssetsDialogOpen.set(true);
};

const getUnusedAssets = () => {
  const assets = $assets.get();
  const usagesByAssetId = calculateUsagesByAssetId({
    pages: $pages.get(),
    props: $props.get(),
    styles: $styles.get(),
    assets,
  });
  const unusedAssets: Asset[] = [];
  for (const asset of assets.values()) {
    const usages = usagesByAssetId.get(asset.id);
    if (usages === undefined || usages.length === 0) {
      unusedAssets.push(asset);
    }
  }
  return unusedAssets;
};

const DeleteUnusedAssetsDialogContent = ({
  onClose,
}: {
  onClose: () => void;
}) => {
  const unusedAssets = getUnusedAssets();

  return (
    <>
      <Flex gap="3" direction="column" css={{ padding: theme.panel.padding }}>
        {unusedAssets.length === 0 ? (
          <Text>There are no unused assets to delete.</Text>
        ) : (
          <>
            <Text>
              Delete {unusedAssets.length} unused{" "}
              {unusedAssets.length === 1 ? "asset" : "assets"} from the project?
            </Text>

            <ScrollArea>
              <Box css={{ maxHeight: 200 }}>
                <Flex direction="column" gap="1">
                  {unusedAssets.map((asset) => (
                    <Text key={asset.id} variant="mono" truncate>
                      {formatAssetName(asset)}
                    </Text>
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
            onClick={() => {
              const count = unusedAssets.length;
              deleteAssets(unusedAssets.map((asset) => asset.id));
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
