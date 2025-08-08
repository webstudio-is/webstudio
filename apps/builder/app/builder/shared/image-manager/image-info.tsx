import prettyBytes from "pretty-bytes";
import { useStore } from "@nanostores/react";
import { getMimeByExtension } from "@webstudio-is/asset-uploader";
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
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
  SmallIconButton,
  Text,
  textVariants,
  theme,
  Tooltip,
} from "@webstudio-is/design-system";
import {
  AspectRatioIcon,
  CloudIcon,
  DimensionsIcon,
  GearIcon,
  PageIcon,
  TrashIcon,
} from "@webstudio-is/icons";
import type { Asset, Instance } from "@webstudio-is/sdk";
import {
  $authPermit,
  $editingPageId,
  $instances,
  $pages,
  $props,
  $styles,
  $styleSourceSelections,
} from "~/shared/nano-states";
import { deleteAssets, $usagesByAssetId, type AssetUsage } from "../assets";
import { getFormattedAspectRatio } from "./utils";
import { hyphenateProperty } from "@webstudio-is/css-engine";
import { $openProjectSettings } from "~/shared/nano-states/project-settings";
import {
  $awareness,
  findAwarenessByInstanceId,
  selectPage,
} from "~/shared/awareness";
import { $activeInspectorPanel, setActiveSidebarPanel } from "../nano-states";

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

const ImageInfoContent = ({
  asset,
  usages,
}: {
  asset: Asset;
  usages: AssetUsage[];
}) => {
  const { size, meta, id, name } = asset;

  const parts = name.split(".");
  const extension = "." + parts.pop();

  const authPermit = useStore($authPermit);

  return (
    <>
      <Box css={{ width: 250, padding: theme.panel.padding }}>
        <Text truncate>{name}</Text>
      </Box>
      <Box css={{ padding: theme.panel.padding }}>
        <Grid
          columns={2}
          css={{ gridTemplateColumns: "auto auto" }}
          align="center"
          gap={3}
        >
          <Flex align="center" css={{ gap: theme.spacing[3] }}>
            <CloudIcon />
            <Text variant="labelsSentenceCase">{prettyBytes(size)}</Text>
          </Flex>
          <Flex align="center" css={{ gap: theme.spacing[3] }}>
            <PageIcon />
            <Text variant="labelsSentenceCase">
              {getMimeByExtension(extension)}
            </Text>
          </Flex>
          {"width" in meta && "height" in meta ? (
            <>
              <Flex align="center" gap={1}>
                <DimensionsIcon />
                <Text variant="labelsSentenceCase">
                  {meta.width} x {meta.height}
                </Text>
              </Flex>
              <Flex align="center" gap={1}>
                <AspectRatioIcon />
                <Text variant="labelsSentenceCase">
                  {getFormattedAspectRatio(meta)}
                </Text>
              </Flex>
            </>
          ) : null}
        </Grid>
      </Box>
      <Box css={{ padding: theme.panel.padding }}>
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
              <Button color="destructive" prefix={<TrashIcon />}>
                Delete
              </Button>
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
      </Box>
    </>
  );
};

const triggerVisibilityVar = `--ws-image-info-trigger-visibility`;

export const imageInfoCssVars = ({ show }: { show: boolean }) => ({
  [triggerVisibilityVar]: show ? "visible" : "hidden",
});

export const ImageInfo = ({ asset }: { asset: Asset }) => {
  const usagesByAssetId = useStore($usagesByAssetId);
  const usages = usagesByAssetId.get(asset.id) ?? [];
  return (
    <Popover modal>
      <PopoverTrigger asChild>
        <SmallIconButton
          title="Options"
          tabIndex={-1}
          data-usage={usages.length > 0 ? "reused" : "unused"}
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
              color: theme.colors.foregroundIconMain,
            },
            "&[data-usage=reused]": {
              visibility: "visible",
              "& svg": {
                fill: `color-mix(
                  in lch,
                  ${theme.colors.backgroundStyleSourceToken} 30%,
                  white 70%
                )`,
              },
              "&:hover": {
                color: theme.colors.foregroundIconMain,
              },
            },
          }}
          icon={<GearIcon />}
        />
      </PopoverTrigger>
      <PopoverContent>
        <PopoverTitle>Asset Details</PopoverTitle>
        <ImageInfoContent asset={asset} usages={usages} />
      </PopoverContent>
    </Popover>
  );
};
