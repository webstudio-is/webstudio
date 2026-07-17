import {
  Button,
  ContextMenu,
  ContextMenuTrigger,
  Flex,
  ScrollAreaNative,
  Separator,
  Text,
  theme,
} from "@webstudio-is/design-system";
import type { AssetFolderHierarchy } from "@webstudio-is/sdk";
import { ChevronRightIcon } from "@webstudio-is/icons";
import { useEffect, useRef, type ReactElement } from "react";
import { AssetManagerItemContextMenuContent } from "./asset-manager-item-menu";

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
  onChange,
  canPaste,
  onPaste,
}: {
  hierarchy: AssetFolderHierarchy;
  folderId: string | undefined;
  onChange: (folderId: string | undefined) => void;
  canPaste?: (folderId: string | undefined) => boolean;
  onPaste?: (folderId: string | undefined) => void;
}) => {
  const path = hierarchy.getPath(folderId);
  const currentFolderRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    currentFolderRef.current?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  }, [folderId]);
  return (
    <>
      <Separator />
      <ScrollAreaNative
        css={{
          width: "100%",
          overflowX: "auto",
          overflowY: "hidden",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
          flexShrink: 0,
          marginBottom: `calc(-1 * ${theme.panel.paddingBlock})`,
        }}
        aria-label="Asset folder path"
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
              ref={folderId === undefined ? currentFolderRef : undefined}
              color="ghost"
              aria-current={folderId === undefined ? "location" : undefined}
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
                  ref={folder.id === folderId ? currentFolderRef : undefined}
                  color="ghost"
                  aria-current={folder.id === folderId ? "location" : undefined}
                  onClick={() => onChange(folder.id)}
                >
                  <Text truncate css={{ minWidth: "3ch", maxWidth: 160 }}>
                    {folder.name}
                  </Text>
                </Button>
              </PasteTarget>
            </Flex>
          ))}
        </Flex>
      </ScrollAreaNative>
    </>
  );
};
