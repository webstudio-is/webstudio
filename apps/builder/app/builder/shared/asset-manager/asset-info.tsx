import isValidFilename from "valid-filename";
import { useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import prettyBytes from "pretty-bytes";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import { getMimeTypeByExtension } from "@webstudio-is/sdk";
import type { Asset, Pages, Props, Styles, Instance } from "@webstudio-is/sdk";
import type {
  ImageValue,
  FontFamilyValue,
  StyleValue,
} from "@webstudio-is/css-engine";
import { mapGetOrInsert } from "~/shared/shim";
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
  TrashIcon,
} from "@webstudio-is/icons";
import { hyphenateProperty } from "@webstudio-is/css-engine";
import {
  $assets,
  $authPermit,
  $editingPageId,
  $instances,
  $pages,
  $props,
  $styles,
  $styleSourceSelections,
  $userPlanFeatures,
} from "~/shared/nano-states";
import { $openProjectSettings } from "~/shared/nano-states/project-settings";
import {
  $awareness,
  findAwarenessByInstanceId,
  selectPage,
} from "~/shared/awareness";
import { updateWebstudioData } from "~/shared/instance-utils";
import { deleteAssets } from "~/builder/shared/assets";
import {
  $activeInspectorPanel,
  setActiveSidebarPanel,
} from "~/builder/shared/nano-states";
import {
  formatAssetName,
  parseAssetName,
  getAssetUrl,
} from "~/builder/shared/assets/asset-utils";
import { getFormattedAspectRatio } from "./utils";
import { CopyToClipboard } from "~/shared/copy-to-clipboard";

type AssetUsage =
  | { type: "favicon" }
  | { type: "socialImage"; pageId: string }
  | { type: "marketplaceThumbnail"; pageId: string }
  | { type: "prop"; propId: string }
  | { type: "style"; styleDeclKey: string };

const traverseStyleValue = (
  styleValue: StyleValue,
  callback: (value: ImageValue | FontFamilyValue) => void
) => {
  if (styleValue.type === "image") {
    callback(styleValue);
  }
  if (styleValue.type === "fontFamily") {
    callback(styleValue);
  }
  if (styleValue.type === "tuple") {
    for (const item of styleValue.value) {
      traverseStyleValue(item, callback);
    }
  }
  if (styleValue.type === "layers") {
    for (const item of styleValue.value) {
      traverseStyleValue(item, callback);
    }
  }
};

const calculateUsagesByAssetId = ({
  pages,
  props,
  styles,
  assets,
}: {
  pages: Pages | undefined;
  props: Props;
  styles: Styles;
  assets: Map<Asset["id"], Asset>;
}): Map<Asset["id"], AssetUsage[]> => {
  const usagesByAsset = new Map<Asset["id"], AssetUsage[]>();

  // Build font family to asset ID map once for O(1) lookups
  const fontFamilyToAssetId = new Map<string, Asset["id"]>();
  for (const asset of assets.values()) {
    if (asset.type === "font") {
      fontFamilyToAssetId.set(asset.meta.family, asset.id);
    }
  }

  if (pages?.meta?.faviconAssetId) {
    const usages = mapGetOrInsert(usagesByAsset, pages.meta.faviconAssetId, []);
    usages.push({ type: "favicon" });
  }
  if (pages) {
    for (const page of [pages.homePage, ...pages.pages]) {
      if (page.meta.socialImageAssetId) {
        const usages = mapGetOrInsert(
          usagesByAsset,
          page.meta.socialImageAssetId,
          []
        );
        usages.push({ type: "socialImage", pageId: page.id });
      }
      if (page.marketplace?.thumbnailAssetId) {
        const usages = mapGetOrInsert(
          usagesByAsset,
          page.marketplace.thumbnailAssetId,
          []
        );
        usages.push({ type: "marketplaceThumbnail", pageId: page.id });
      }
    }
  }
  for (const prop of props.values()) {
    if (
      prop.type === "asset" &&
      // ignore width and height properties which are specific to size
      prop.name !== "width" &&
      prop.name !== "height"
    ) {
      const usages = mapGetOrInsert(usagesByAsset, prop.value, []);
      usages.push({ type: "prop", propId: prop.id });
    }
  }
  for (const [styleDeclKey, styleDecl] of styles) {
    traverseStyleValue(styleDecl.value, (value) => {
      if (value.type === "image" && value.value.type === "asset") {
        const usages = mapGetOrInsert(usagesByAsset, value.value.value, []);
        usages.push({ type: "style", styleDeclKey });
      }
      if (value.type === "fontFamily") {
        // Match each font family name to its asset ID
        for (const fontFamily of value.value) {
          const assetId = fontFamilyToAssetId.get(fontFamily);
          if (assetId !== undefined) {
            const usages = mapGetOrInsert(usagesByAsset, assetId, []);
            usages.push({ type: "style", styleDeclKey });
          }
        }
      }
    });
  }
  return usagesByAsset;
};

const $usagesByAssetId = computed(
  [$pages, $props, $styles, $assets],
  (pages, props, styles, assets) => {
    return calculateUsagesByAssetId({ pages, props, styles, assets });
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
                  const awareness = findAwarenessByInstanceId(
                    pages,
                    instances,
                    prop.instanceId
                  );
                  $awareness.set(awareness);
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
                  const awareness = findAwarenessByInstanceId(
                    pages,
                    instances,
                    styleInstanceId
                  );
                  $awareness.set(awareness);
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
  const userPlanFeatures = useStore($userPlanFeatures);
  const hasPaidPlan = userPlanFeatures.purchases.length > 0;
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
      updateWebstudioData((data) => {
        const asset = data.assets.get(assetId);
        if (asset) {
          asset.filename = newFilename;
        }
      });
    }
  );
  const [description, setDescription] = useLocalValue(
    asset.description ?? "",
    (newDescription) => {
      const assetId = asset.id;
      updateWebstudioData((data) => {
        const asset = data.assets.get(assetId);
        if (asset) {
          asset.description = newDescription;
        }
      });
    }
  );

  const authPermit = useStore($authPermit);

  let downloadError: undefined | string;
  if (authPermit === "view") {
    downloadError =
      "Unavailable in View mode. Switch to Edit to download assets.";
  } else if (!hasPaidPlan) {
    downloadError = "Upgrade to Pro to download assets.";
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
          <PopoverTitle>Asset Details</PopoverTitle>
          <AssetInfoContent asset={asset} usages={usages} />
        </PopoverContent>
      </Popover>
      {usages.length === 0 && (
        <UsageDot css={{ position: "absolute", top: 9, right: 9 }} />
      )}
    </>
  );
};

export const __testing__ = {
  traverseStyleValue,
  calculateUsagesByAssetId,
};
