import {
  Button,
  ContextMenu,
  ContextMenuTrigger,
  Flex,
  ScrollAreaNative,
  Separator,
  SmallIconButton,
  Text,
  theme,
} from "@webstudio-is/design-system";
import type { AssetFolderHierarchy } from "@webstudio-is/sdk";
import { ChevronRightIcon, CopyIcon } from "@webstudio-is/icons";
import { useEffect, useRef, type ReactElement } from "react";
import { CopyToClipboard } from "~/shared/copy-to-clipboard";
import { AssetManagerItemContextMenuContent } from "./asset-manager-item-menu";
import { formatAssetFolderPath } from "./asset-folder-utils";

type SelectedItem =
  | { type: "folder"; id: string }
  | {
      type: "asset";
      folderId: string | undefined;
      name: string;
    };

const PasteTarget = ({
  children,
  folderId,
  canPaste,
  onPaste,
}: {
  children: ReactElement;
  folderId: string | undefined;
  canPaste?: (folderId: string | undefined) => boolean;
  onPaste?: (folderId: string | undefined) => void;
}) => {
  if (onPaste === undefined || canPaste?.(folderId) === false) {
    return children;
  }
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <AssetManagerItemContextMenuContent
        actions={{ paste: () => onPaste(folderId) }}
      />
    </ContextMenu>
  );
};

export const AssetFolderBreadcrumbs = ({
  hierarchy,
  folderId,
  selectedItem,
  onChange,
  canPaste,
  onPaste,
}: {
  hierarchy: AssetFolderHierarchy;
  folderId: string | undefined;
  selectedItem?: SelectedItem;
  onChange: (folderId: string | undefined) => void;
  canPaste?: (folderId: string | undefined) => boolean;
  onPaste?: (folderId: string | undefined) => void;
}) => {
  const pathFolderId =
    selectedItem?.type === "folder"
      ? selectedItem.id
      : (selectedItem?.folderId ?? folderId);
  const path = hierarchy.getPath(pathFolderId);
  const folderPath = formatAssetFolderPath(hierarchy, pathFolderId);
  const copyPath =
    selectedItem?.type === "asset"
      ? `${folderPath} / ${selectedItem.name}`
      : folderPath;
  const currentPathRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    currentPathRef.current?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  }, [folderId, selectedItem]);
  return (
    <>
      <Separator />
      <Flex
        align="center"
        data-asset-folder-breadcrumbs=""
        css={{
          width: "100%",
          flexShrink: 0,
          marginBottom: `calc(-1 * ${theme.panel.paddingBlock})`,
          "& [data-copy-asset-path]": { visibility: "hidden" },
          "&:hover [data-copy-asset-path], &:focus-within [data-copy-asset-path]":
            { visibility: "visible" },
        }}
      >
        <ScrollAreaNative
          css={{
            minWidth: 0,
            flexGrow: 1,
            overflowX: "auto",
            overflowY: "hidden",
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }}
          aria-label="Asset path"
        >
          <Flex
            align="center"
            gap={1}
            css={{
              minWidth: "max-content",
              minHeight: theme.spacing[12],
              paddingInline: theme.spacing[2],
              paddingBlock: theme.spacing[2],
            }}
          >
            <PasteTarget
              folderId={undefined}
              canPaste={canPaste}
              onPaste={onPaste}
            >
              <Button
                ref={(element) => {
                  if (pathFolderId === undefined) {
                    currentPathRef.current = element;
                  }
                }}
                color="ghost"
                aria-current={
                  pathFolderId === undefined && selectedItem === undefined
                    ? "location"
                    : undefined
                }
                onClick={() => onChange(undefined)}
              >
                <Text css={{ minWidth: "3ch" }}>Root</Text>
              </Button>
            </PasteTarget>
            {path.map((folder) => (
              <Flex key={folder.id} align="center" shrink={false}>
                <ChevronRightIcon size={12} />
                <PasteTarget
                  folderId={folder.id}
                  canPaste={canPaste}
                  onPaste={onPaste}
                >
                  <Button
                    ref={(element) => {
                      if (
                        folder.id === pathFolderId &&
                        selectedItem?.type !== "asset"
                      ) {
                        currentPathRef.current = element;
                      }
                    }}
                    color="ghost"
                    aria-current={
                      folder.id === pathFolderId &&
                      selectedItem?.type !== "asset"
                        ? "location"
                        : undefined
                    }
                    onClick={() => onChange(folder.id)}
                  >
                    <Text truncate css={{ minWidth: "3ch", maxWidth: 160 }}>
                      {folder.name}
                    </Text>
                  </Button>
                </PasteTarget>
              </Flex>
            ))}
            {selectedItem?.type === "asset" && (
              <Flex align="center" shrink={false}>
                <ChevronRightIcon size={12} />
                <Text
                  ref={(element) => {
                    currentPathRef.current = element;
                  }}
                  aria-current="location"
                  truncate
                  css={{
                    minWidth: "3ch",
                    maxWidth: 160,
                    paddingInline: theme.spacing[3],
                  }}
                >
                  {selectedItem.name}
                </Text>
              </Flex>
            )}
          </Flex>
        </ScrollAreaNative>
        <Flex
          data-copy-asset-path=""
          shrink={false}
          css={{ paddingInline: theme.spacing[2] }}
        >
          <CopyToClipboard text={copyPath} copyText="Copy path">
            <SmallIconButton aria-label="Copy path" icon={<CopyIcon />} />
          </CopyToClipboard>
        </Flex>
      </Flex>
    </>
  );
};
