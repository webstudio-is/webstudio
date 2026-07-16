import {
  Button,
  Flex,
  ScrollAreaNative,
  Separator,
  Text,
  theme,
} from "@webstudio-is/design-system";
import type { AssetFolderHierarchy } from "@webstudio-is/sdk";
import { ChevronRightIcon } from "@webstudio-is/icons";
import { useEffect, useRef } from "react";

export const AssetFolderBreadcrumbs = ({
  hierarchy,
  folderId,
  onChange,
}: {
  hierarchy: AssetFolderHierarchy;
  folderId: string | undefined;
  onChange: (folderId: string | undefined) => void;
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
          <Button
            ref={folderId === undefined ? currentFolderRef : undefined}
            color="ghost"
            aria-current={folderId === undefined ? "location" : undefined}
            onClick={() => onChange(undefined)}
          >
            <Text css={{ minWidth: "5ch" }}>Root</Text>
          </Button>
          {path.map((folder) => (
            <Flex key={folder.id} align="center" shrink={false}>
              <ChevronRightIcon size={12} />
              <Button
                ref={folder.id === folderId ? currentFolderRef : undefined}
                color="ghost"
                aria-current={folder.id === folderId ? "location" : undefined}
                onClick={() => onChange(folder.id)}
              >
                <Text truncate css={{ minWidth: "5ch", maxWidth: 160 }}>
                  {folder.name}
                </Text>
              </Button>
            </Flex>
          ))}
        </Flex>
      </ScrollAreaNative>
    </>
  );
};
