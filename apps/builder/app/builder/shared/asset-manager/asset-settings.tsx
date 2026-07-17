import isValidFilename from "valid-filename";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useDebouncedCallback } from "use-debounce";
import prettyBytes from "pretty-bytes";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import { getMimeTypeByExtension } from "@webstudio-is/sdk";
import type { Asset, Instance } from "@webstudio-is/sdk";
import {
  Box,
  Button,
  css,
  Dialog,
  DialogContent,
  DialogTitle,
  Flex,
  Grid,
  IconButton,
  InputErrorsTooltip,
  InputField,
  Label,
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTitle,
  SmallIconButton,
  styled,
  Text,
  TextArea,
  textVariants,
  theme,
  Tooltip,
} from "@webstudio-is/design-system";
import {
  AspectRatioIcon,
  CloudIcon,
  CopyIcon,
  DimensionsIcon,
  DownloadIcon,
  InfoCircleIcon,
  PageIcon,
  RefreshCcwIcon,
  TrashIcon,
} from "@webstudio-is/icons";
import { hyphenateProperty } from "@webstudio-is/css-engine";
import {
  $authPermit,
  $editingPageId,
  $permissions,
} from "~/shared/nano-states";
import { $assets } from "~/shared/sync/data-stores";
import { $styleSourceSelections } from "~/shared/sync/data-stores";
import { $openProjectSettings } from "~/shared/nano-states/project-settings";
import { $styles } from "~/shared/sync/data-stores";
import { selectInstance } from "~/shared/nano-states";
import { selectPage } from "~/shared/nano-states";
import { findPageAndSelectorByInstanceId } from "@webstudio-is/project-build/runtime";
import { $selectedPageId } from "~/shared/nano-states";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { deleteAssets } from "~/builder/shared/assets";
import {
  $activeInspectorPanel,
  setActiveSidebarPanel,
} from "~/builder/shared/nano-states";
import {
  $instances,
  $pages,
  $projectSettings,
  $props,
} from "~/shared/sync/data-stores";
import {
  formatAssetName,
  parseAssetName,
} from "@webstudio-is/project-build/runtime";
import { AssetFolderSelector } from "./asset-folder-selector";
import { moveAssetManagerItems } from "./asset-manager-operations";
import { getAssetUrl } from "~/builder/shared/assets/asset-utils";
import { getFormattedAspectRatio } from "./utils";
import { CopyToClipboard } from "~/shared/copy-to-clipboard";
import {
  calculateUsagesByAssetId,
  type AssetUsage,
} from "@webstudio-is/project-build/runtime";

const $usagesByAssetId = computed(
  [$pages, $projectSettings, $props, $styles, $assets],
  (pages, projectSettings, props, styles, assets) => {
    return calculateUsagesByAssetId({
      pages,
      projectSettings,
      props,
      styles,
      assets,
    });
  }
);

const buttonLinkClass = css({
  all: "unset",
  cursor: "pointer",
  ...textVariants.link,
}).toString();

const AssetUsagesList = ({ usages }: { usages: AssetUsage[] }) => {
  const props = useStore($props);
  const styles = useStore($styles);
  return (
    <Text as="ul" css={{ paddingLeft: "1em", listStyleType: '"-"' }}>
      {usages.map((usage, index) => {
        if (usage.type === "favicon") {
          return (
            <li key={index}>
              <button
                className={buttonLinkClass}
                onClick={() => {
                  $openProjectSettings.set("general");
                  setActiveSidebarPanel("auto");
                }}
              >
                Favicon
              </button>
            </li>
          );
        }
        if (usage.type === "socialImage") {
          return (
            <li key={index}>
              <button
                className={buttonLinkClass}
                onClick={() => {
                  selectPage(usage.pageId);
                  setActiveSidebarPanel("pages");
                  $editingPageId.set(usage.pageId);
                }}
              >
                Page social image
              </button>
            </li>
          );
        }
        if (usage.type === "marketplaceThumbnail") {
          return (
            <li key={index}>
              <button
                className={buttonLinkClass}
                onClick={() => {
                  selectPage(usage.pageId);
                  setActiveSidebarPanel("pages");
                  $editingPageId.set(usage.pageId);
                }}
              >
                Marketplace page thumbnail
              </button>
            </li>
          );
        }
        if (usage.type === "prop") {
          return (
            <li key={index}>
              <button
                className={buttonLinkClass}
                onClick={() => {
                  const pages = $pages.get();
                  const instances = $instances.get();
                  const prop = $props.get().get(usage.propId);
                  if (!prop || !pages) {
                    return;
                  }
                  const { pageId, instanceSelector } =
                    findPageAndSelectorByInstanceId(
                      pages,
                      instances,
                      prop.instanceId
                    );
                  $selectedPageId.set(pageId);
                  selectInstance(instanceSelector);
                  setActiveSidebarPanel("auto");
                  $activeInspectorPanel.set("settings");
                }}
              >
                "{props.get(usage.propId)?.name}" property
              </button>
            </li>
          );
        }
        if (usage.type === "style") {
          const styleDecl = styles.get(usage.styleDeclKey);
          const property = styleDecl
            ? hyphenateProperty(styleDecl.property)
            : undefined;
          return (
            <li key={index}>
              <button
                className={buttonLinkClass}
                onClick={() => {
                  const pages = $pages.get();
                  const instances = $instances.get();
                  const styleDecl = $styles.get().get(usage.styleDeclKey);
                  const styleSourceSelections = $styleSourceSelections.get();
                  if (!styleDecl) {
                    return;
                  }
                  let styleInstanceId: undefined | Instance["id"];
                  for (const {
                    instanceId,
                    values,
                  } of styleSourceSelections.values()) {
                    if (values.includes(styleDecl.styleSourceId)) {
                      styleInstanceId = instanceId;
                      break;
                    }
                  }
                  if (!styleInstanceId || !pages) {
                    return;
                  }
                  const { pageId, instanceSelector } =
                    findPageAndSelectorByInstanceId(
                      pages,
                      instances,
                      styleInstanceId
                    );
                  $selectedPageId.set(pageId);
                  selectInstance(instanceSelector);
                  setActiveSidebarPanel("auto");
                  $activeInspectorPanel.set("style");
                }}
              >
                "{property}" style
              </button>
            </li>
          );
        }
        usage satisfies never;
      })}
    </Text>
  );
};

const AssetUsageIndicator = styled(Box, {
  width: 4,
  height: 4,
  backgroundColor: theme.colors.backgroundStatusAttention,
  borderRadius: "50%",
  pointerEvents: "none",
});

const useLocalValue = <Type extends string>(
  savedValue: Type,
  onSave: (value: Type) => void
) => {
  const [localValue, setLocalValue] = useState(savedValue);

  const save = () => {
    if (localValue !== savedValue) {
      // To synchronize with setState immediately followed by save
      onSave(localValue);
    }
  };

  const saveDebounced = useDebouncedCallback(save, 500);
  const updateLocalValue = (value: Type) => {
    setLocalValue(value);
    saveDebounced();
  };

  // onBlur will not trigger if control is unmounted when props panel is closed or similar.
  // So we're saving at the unmount
  // store save in ref to access latest saved value from render
  // instead of stale one
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    // access ref in the moment of unmount
    return () => saveRef.current();
  }, []);

  return [
    /**
     * Contains:
     *  - either the latest `savedValue`
     *  - or the latest value set via `set()`
     * (whichever changed most recently)
     */
    localValue,
    updateLocalValue,
  ] as const;
};

const AssetSettingsContent = ({
  asset,
  usages,
  onDelete,
  onReplace,
  focusName,
}: {
  asset: Asset;
  usages: AssetUsage[];
  onDelete?: () => void;
  onReplace?: () => void;
  focusName: boolean;
}) => {
  const { canDownloadAssets } = useStore($permissions);
  const { size, meta, id, name } = asset;
  const { basename, ext } = parseAssetName(name);
  const [filenameError, setFilenameError] = useState<string>();
  const [filename, setFilename] = useLocalValue(
    asset.filename ?? basename,
    (newFilename) => {
      const assetId = asset.id;
      // validate filename
      if (!isValidFilename(newFilename)) {
        setFilenameError("Invalid filename");
        return;
      }
      // validate duplicates
      for (const asset of $assets.get().values()) {
        if (asset.id !== assetId) {
          const filename =
            asset.filename ?? parseAssetName(asset.name).basename;
          if (newFilename === filename) {
            setFilenameError("Filename already used");
            return;
          }
        }
      }
      executeRuntimeMutation({
        id: "assets.update",
        input: {
          assetId,
          values: { filename: newFilename },
        },
      });
    }
  );
  const [description, setDescription] = useLocalValue(
    asset.description ?? "",
    (newDescription) => {
      const assetId = asset.id;
      executeRuntimeMutation({
        id: "assets.update",
        input: {
          assetId,
          values: { description: newDescription },
        },
      });
    }
  );

  const moveToFolder = (newFolderId: string | undefined) =>
    moveAssetManagerItems([{ type: "asset", id: asset.id }], newFolderId);

  const authPermit = useStore($authPermit);
  let downloadError: undefined | string;
  if (authPermit === "view") {
    downloadError =
      "Unavailable in View mode. Switch to Edit to download assets.";
  } else if (canDownloadAssets === false) {
    downloadError = "Upgrade to Pro to download assets.";
  }

  const isImage = asset.type === "image";
  let replaceError: undefined | string;
  if (authPermit === "view") {
    replaceError = "View mode. You can't replace assets.";
  }

  return (
    <>
      <Box css={{ padding: theme.panel.padding }}>
        <Grid
          columns={2}
          css={{ gridTemplateColumns: "auto auto" }}
          align="center"
          gap={3}
        >
          <Flex align="center" css={{ gap: theme.spacing[3] }}>
            <CloudIcon />
            <Text variant="labels">{prettyBytes(size)}</Text>
          </Flex>
          <Flex align="center" css={{ gap: theme.spacing[3] }}>
            <PageIcon />
            <Text variant="labels">
              {getMimeTypeByExtension(ext) ?? "unknown"}
            </Text>
          </Flex>
          {"width" in meta && "height" in meta && (
            <>
              <Flex align="center" gap={1}>
                <DimensionsIcon />
                <Text variant="labels">
                  {meta.width} x {meta.height}
                </Text>
              </Flex>
              <Flex align="center" gap={1}>
                <AspectRatioIcon />
                <Text variant="labels">{getFormattedAspectRatio(meta)}</Text>
              </Flex>
            </>
          )}
          <Flex align="center" css={{ gap: theme.spacing[3] }}>
            <Flex
              css={{
                width: 16,
                height: 16,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <AssetUsageIndicator data-asset-settings-usage-indicator="" />
            </Flex>
            <Text variant="labels">{usages.length} uses</Text>
          </Flex>
        </Grid>
      </Box>

      <Grid css={{ padding: theme.panel.padding, gap: 4 }}>
        <Label htmlFor="asset-manager-filename">Name</Label>
        <InputErrorsTooltip
          errors={filenameError ? [filenameError] : undefined}
        >
          <InputField
            id="asset-manager-filename"
            autoFocus={focusName}
            readOnly={authPermit === "view"}
            color={filenameError ? "error" : undefined}
            value={filename}
            onChange={(event) => {
              setFilename(event.target.value);
              setFilenameError(undefined);
            }}
          />
        </InputErrorsTooltip>
      </Grid>

      <Grid css={{ padding: theme.panel.padding, gap: 4 }}>
        <Label
          htmlFor="asset-manager-description"
          css={{ display: "flex", alignItems: "center", gap: 4 }}
        >
          Description
          <Tooltip
            variant="wrapped"
            content="The description is used as the default “alt” text for the image."
          >
            <InfoCircleIcon />
          </Tooltip>
        </Label>
        <TextArea
          id="asset-manager-description"
          readOnly={authPermit === "view"}
          placeholder='Enter "alt" text'
          rows={1}
          maxRows={6}
          autoGrow
          value={description}
          onChange={setDescription}
        />
      </Grid>

      <Grid css={{ padding: theme.panel.padding, gap: 4 }}>
        <AssetFolderSelector
          value={asset.folderId}
          onChange={moveToFolder}
          rootLabel="Folder"
          disabled={authPermit === "view"}
          deferChangesUntilBlur
        />
      </Grid>

      <Grid css={{ padding: theme.panel.padding, gap: 4 }}>
        <Label htmlFor="asset-manager-id">ID</Label>
        <InputField
          id="asset-manager-id"
          readOnly
          value={id}
          suffix={
            <Flex justify="center" css={{ paddingInline: theme.spacing[2] }}>
              <CopyToClipboard text={id}>
                <SmallIconButton icon={<CopyIcon />} />
              </CopyToClipboard>
            </Flex>
          }
        />
      </Grid>

      <Flex justify="between" css={{ padding: theme.panel.padding }}>
        {authPermit === "view" ? (
          <Tooltip side="bottom" content="View mode. You can't delete assets.">
            <Button disabled color="destructive" prefix={<TrashIcon />}>
              Delete
            </Button>
          </Tooltip>
        ) : usages.length === 0 ? (
          <Button color="destructive" onClick={onDelete} prefix={<TrashIcon />}>
            Delete
          </Button>
        ) : (
          <Button onClick={onDelete}>Review & delete</Button>
        )}

        <Flex gap="1">
          {isImage && (
            <>
              {replaceError || onReplace === undefined ? (
                <Tooltip side="bottom" content={replaceError}>
                  <IconButton disabled>
                    <RefreshCcwIcon />
                  </IconButton>
                </Tooltip>
              ) : (
                <Tooltip side="bottom" content="Replace asset">
                  <IconButton aria-label="Replace asset" onClick={onReplace}>
                    <RefreshCcwIcon />
                  </IconButton>
                </Tooltip>
              )}
            </>
          )}
          {downloadError ? (
            <Tooltip side="bottom" content={downloadError}>
              <IconButton disabled>
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip side="bottom" content="Download asset">
              <IconButton
                as="a"
                download={formatAssetName(asset)}
                href={getAssetUrl(asset, window.location.origin).href}
              >
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          )}
        </Flex>
      </Flex>
    </>
  );
};

export const AssetDeleteDialog = ({
  asset,
  open,
  onOpenChange,
}: {
  asset: Asset;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const usagesByAssetId = useStore($usagesByAssetId);
  const usages = usagesByAssetId.get(asset.id) ?? [];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent minWidth={360} aria-describedby={undefined}>
        <DialogTitle>Delete asset?</DialogTitle>
        <Box css={{ padding: theme.panel.padding }}>
          <Text>Delete “{formatAssetName(asset)}”?</Text>
          {usages.length > 0 && (
            <>
              <Text css={{ marginTop: "1em", marginBottom: "1em" }}>
                This asset is used in the following places:
              </Text>
              <AssetUsagesList usages={usages} />
            </>
          )}
          <Flex justify="end" css={{ marginTop: theme.panel.paddingBlock }}>
            <Button
              autoFocus
              color="destructive"
              prefix={<TrashIcon />}
              onClick={() => deleteAssets([asset.id])}
            >
              Delete
            </Button>
          </Flex>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export const AssetSettings = ({
  asset,
  open,
  onOpenChange,
  onDelete,
  onReplace,
  focusName = false,
  children,
}: {
  asset: Asset;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: () => void;
  onReplace?: () => void;
  focusName?: boolean;
  children: ReactNode;
}) => {
  const usagesByAssetId = useStore($usagesByAssetId);
  const usages = usagesByAssetId.get(asset.id) ?? [];
  const deleteAsset =
    onDelete === undefined
      ? undefined
      : () => {
          onOpenChange(false);
          onDelete();
        };
  return (
    <Popover modal open={open} onOpenChange={onOpenChange}>
      {usages.length === 0 && (
        <AssetUsageIndicator
          role="img"
          aria-label="Unused asset"
          data-asset-thumbnail-indicator=""
        />
      )}
      <PopoverAnchor asChild>{children}</PopoverAnchor>
      <PopoverContent css={{ minWidth: 250 }}>
        <PopoverTitle>Asset settings</PopoverTitle>
        <AssetSettingsContent
          asset={asset}
          usages={usages}
          onDelete={deleteAsset}
          onReplace={onReplace}
          focusName={focusName}
        />
      </PopoverContent>
    </Popover>
  );
};
