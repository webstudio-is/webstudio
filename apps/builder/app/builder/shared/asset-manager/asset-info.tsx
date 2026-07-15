import isValidFilename from "valid-filename";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import prettyBytes from "pretty-bytes";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import { getMimeTypeByExtension, IMAGE_MIME_TYPES } from "@webstudio-is/sdk";
import type { Asset, Instance } from "@webstudio-is/sdk";
import {
  Box,
  Button,
  css,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  Flex,
  Grid,
  IconButton,
  InputErrorsTooltip,
  InputField,
  Label,
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
  SmallIconButton,
  styled,
  Text,
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
  GearIcon,
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
import { deleteAssets, replaceAsset } from "~/builder/shared/assets";
import { validateFiles } from "~/builder/shared/assets/asset-upload";
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

const UsageDot = styled(Box, {
  width: 6,
  height: 6,
  backgroundColor: "#000",
  border: "1px solid white",
  boxShadow: "0 0 3px rgb(0, 0, 0)",
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

const AssetInfoContent = ({
  asset,
  usages,
}: {
  asset: Asset;
  usages: AssetUsage[];
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

  const authPermit = useStore($authPermit);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const handleReplaceFile = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = validateFiles(Array.from(event.target.files ?? []));
      const file = files[0];
      if (file) {
        replaceAsset(id, file);
      }
      // Reset input so the same file can be selected again
      event.target.value = "";
    },
    [id]
  );

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
              <UsageDot />
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
        <InputField
          id="asset-manager-description"
          placeholder='Enter "alt" text'
          value={description}
          onChange={(event) => setDescription(event.target.value)}
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
          <Button
            color="destructive"
            onClick={() => deleteAssets([id])}
            prefix={<TrashIcon />}
          >
            Delete
          </Button>
        ) : (
          <Dialog>
            <DialogTrigger asChild>
              <Button>Review & delete</Button>
            </DialogTrigger>
            <DialogContent minWidth={360}>
              <DialogTitle>Delete asset?</DialogTitle>
              <Box css={{ padding: theme.panel.padding }}>
                <Text css={{ marginBottom: "1em" }}>
                  This asset is used in following places:
                </Text>
                <AssetUsagesList usages={usages} />
                <Flex>
                  <Button
                    css={{
                      marginLeft: "auto",
                      marginTop: theme.panel.paddingBlock,
                    }}
                    color="destructive"
                    prefix={<TrashIcon />}
                    onClick={() => deleteAssets([id])}
                  >
                    Delete
                  </Button>
                </Flex>
              </Box>
            </DialogContent>
          </Dialog>
        )}

        <Flex gap="1">
          {isImage && (
            <>
              <input
                ref={replaceInputRef}
                type="file"
                accept={IMAGE_MIME_TYPES.join(", ")}
                style={{ display: "none" }}
                onChange={handleReplaceFile}
              />
              {replaceError ? (
                <Tooltip side="bottom" content={replaceError}>
                  <IconButton disabled>
                    <RefreshCcwIcon />
                  </IconButton>
                </Tooltip>
              ) : (
                <Tooltip side="bottom" content="Replace asset">
                  <IconButton
                    aria-label="Replace asset"
                    onClick={() => replaceInputRef.current?.click()}
                  >
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

const triggerVisibilityVar = `--ws-asset-info-trigger-visibility`;

export const assetInfoCssVars = ({ show }: { show: boolean }) => ({
  [triggerVisibilityVar]: show ? "visible" : "hidden",
});

export const AssetInfo = ({ asset }: { asset: Asset }) => {
  const usagesByAssetId = useStore($usagesByAssetId);
  const usages = usagesByAssetId.get(asset.id) ?? [];
  return (
    <>
      <Popover modal>
        <PopoverTrigger asChild>
          <SmallIconButton
            title="Options"
            tabIndex={-1}
            css={{
              visibility: `var(${triggerVisibilityVar}, hidden)`,
              position: "absolute",
              color: theme.colors.backgroundIconSubtle,
              top: theme.spacing[3],
              right: theme.spacing[3],
              cursor: "pointer",
              transition: "opacity 100ms ease",
              "& svg": {
                fill: `oklch(from ${theme.colors.white} l c h / 0.9)`,
              },
              "&:hover": {
                color: theme.colors.backgroundIconSubtle,
                background: "transparent",
                "& svg": {
                  fill: `oklch(from ${theme.colors.white} l c h / 1)`,
                },
              },
            }}
            icon={<GearIcon />}
          />
        </PopoverTrigger>
        <PopoverContent css={{ minWidth: 250 }}>
          <PopoverTitle>Asset details</PopoverTitle>
          <AssetInfoContent asset={asset} usages={usages} />
        </PopoverContent>
      </Popover>
      {usages.length === 0 && (
        <UsageDot css={{ position: "absolute", top: 9, right: 9 }} />
      )}
    </>
  );
};
