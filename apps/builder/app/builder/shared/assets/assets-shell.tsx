import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type JSX,
  type PointerEvent,
} from "react";
import type { AssetType } from "@webstudio-is/asset-uploader";
import {
  ContextMenu,
  ContextMenuTrigger,
  Flex,
  ScrollAreaNative,
  SearchField,
  theme,
  toast,
} from "@webstudio-is/design-system";
import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import {
  acceptUploadType,
  groupFilesByAssetType,
  validateFiles,
} from "./asset-upload";
import { AssetPanelState } from "./asset-panel-state";
import { Separator } from "./separator";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { containsFiles } from "@atlaskit/pragmatic-drag-and-drop/external/file";
import { dropTargetForExternal } from "@atlaskit/pragmatic-drag-and-drop/external/adapter";
import invariant from "tiny-invariant";
import type { ContainsSource } from "@atlaskit/pragmatic-drag-and-drop/dist/types/public-utils/external/native-types";
import { uploadAssets } from "./upload-assets";
import {
  createDroppedAssetFolderStructure,
  readDroppedAssetItems,
} from "./directory-drop";
import { $assetFolders } from "~/shared/sync/data-stores";
import { createAssetFolderHierarchy } from "@webstudio-is/sdk";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { onNextTransactionComplete } from "~/shared/sync/project-queue";
import {
  IDLE,
  isBlockedByBackdrop,
  registerDrop,
  useExternalDragStateEffect,
  type ExternalMonitorDragState,
} from "./drag-monitor";

type AssetsShellProps = {
  filters?: JSX.Element;
  searchProps: ComponentProps<typeof SearchField>;
  children: JSX.Element;
  interactionOverlay?: JSX.Element;
  footer?: JSX.Element;
  type: AssetType;
  accept?: string;
  isEmpty: boolean;
  emptyMessage?: string;
  emptyContent?: JSX.Element;
  folderId?: string;
  contextMenu?: JSX.Element;
  onContextMenu?: ComponentProps<typeof Flex>["onContextMenu"];
  onPointerDown?: (
    event: PointerEvent<HTMLElement>,
    listViewport: HTMLElement | null
  ) => void;
  onKeyDown?: ComponentProps<typeof Flex>["onKeyDown"];
  onElementChange?: (element: HTMLDivElement | null) => void;
  autoScrollOnElementDrag?: boolean;
  allowFolderDrop?: boolean;
};

const containsFilesOrUri = (parameter: ContainsSource) => {
  return (
    containsFiles(parameter) || parameter.source.types.includes("text/uri-list")
  );
};

const OVER = 2;
type DropTargetState = typeof IDLE | typeof OVER;

const uploadDroppedFiles = ({
  files,
  type,
  accept,
  folderId,
}: {
  files: File[];
  type: AssetType;
  accept?: string;
  folderId?: string;
}) => {
  const validFiles = validateFiles(files).filter((file) => {
    if (acceptUploadType(type, accept, file)) {
      return true;
    }

    console.warn(
      `Unsupported file dropped for type=${type}, accept=${accept} and file.type=${file.type}, file.name=${file.name}`
    );
    return false;
  });

  for (const [detectedType, filesOfType] of groupFilesByAssetType(validFiles)) {
    uploadAssets(detectedType, filesOfType, { folderId });
  }
};

export const AssetsShell = ({
  filters,
  searchProps,
  isEmpty,
  emptyMessage,
  emptyContent,
  children,
  interactionOverlay,
  footer,
  folderId,
  contextMenu,
  onContextMenu,
  onPointerDown,
  onKeyDown,
  onElementChange,
  autoScrollOnElementDrag = false,
  allowFolderDrop = false,
  type,
  accept,
}: AssetsShellProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const listViewportRef = useRef<HTMLDivElement | null>(null);
  const [monitorState, setMonitorState] =
    useState<ExternalMonitorDragState>(IDLE);

  const [dropTargetState, setDropTargetState] = useState<DropTargetState>(IDLE);
  const dropMessage = allowFolderDrop
    ? "Drop files or folders here"
    : "Drop files here";
  const dropDescription = allowFolderDrop
    ? "Drop files or folders from your computer into this panel."
    : "Drop files from anywhere into this panel.";
  const resolvedEmptyMessage = emptyMessage ?? dropMessage;

  useEffect(() => {
    const element = listViewportRef.current;
    if (element === null || autoScrollOnElementDrag === false) {
      return;
    }
    return autoScrollForElements({
      element,
      getAllowedAxis: () => "vertical",
    });
  }, [autoScrollOnElementDrag, isEmpty]);

  useExternalDragStateEffect((state) => {
    const element = ref.current;

    if (element == null) {
      return;
    }

    if (state === IDLE) {
      setMonitorState(IDLE);
      return;
    }

    if (isBlockedByBackdrop(element)) {
      setMonitorState(IDLE);
      return;
    }

    setMonitorState(state);
  });

  /**
   * Allow URL drop for images only
   */
  const containsByType = type === "image" ? containsFilesOrUri : containsFiles;

  useEffect(() => {
    const element = ref.current;

    invariant(element);

    // Do not react if any dialog is opened above
    const isBlockedByBackdropCallback = (
      blocked: typeof containsByType,
      notBlocked: typeof containsByType
    ) => {
      return (parameter: ContainsSource) => {
        // Check if this element is the original element or its descendant
        return isBlockedByBackdrop(element)
          ? blocked(parameter)
          : notBlocked(parameter);
      };
    };

    return combine(
      dropTargetForExternal({
        element: element,
        canDrop: isBlockedByBackdropCallback(() => false, containsByType),
        onDragEnter: () => setDropTargetState(OVER),
        onDragLeave: () => setDropTargetState(IDLE),
        onDrop: async ({ source }) => {
          registerDrop();
          setMonitorState(IDLE);
          setDropTargetState(IDLE);

          const droppedItemsPromise = readDroppedAssetItems(source.items);
          const droppedUrlsPromise = Promise.all(
            source.items
              .filter((item) => item.type === "text/uri-list")
              .map(
                (item) =>
                  new Promise<URL>((resolve) =>
                    item.getAsString((str) => resolve(new URL(str)))
                  )
              )
          );
          try {
            const [droppedItems, droppedUrls] = await Promise.all([
              droppedItemsPromise,
              droppedUrlsPromise,
            ]);
            let didCreateFolder = false;
            const fileGroups = allowFolderDrop
              ? await createDroppedAssetFolderStructure({
                  directories: droppedItems.directories,
                  parentFolderId: folderId,
                  getOrCreateFolder: (name, parentId) => {
                    const hierarchy = createAssetFolderHierarchy(
                      $assetFolders.get()
                    );
                    const existing = hierarchy.findByName({ name, parentId });
                    if (existing !== undefined) {
                      return existing.id;
                    }
                    didCreateFolder = true;
                    const result = executeRuntimeMutation({
                      id: "assetFolders.create",
                      input: { name, parentId },
                    });
                    if (result === undefined) {
                      throw new Error(
                        `Unable to create asset folder "${name}"`
                      );
                    }
                    return result.result.folderId;
                  },
                })
              : [];

            if (
              allowFolderDrop === false &&
              droppedItems.directories.length > 0
            ) {
              toast.error("Folder upload is only available in Assets.");
            }

            const uploadFolderFiles = () => {
              for (const { files, folderId } of fileGroups) {
                uploadDroppedFiles({
                  files,
                  type,
                  accept,
                  folderId,
                });
              }
            };
            if (didCreateFolder && fileGroups.length > 0) {
              onNextTransactionComplete(uploadFolderFiles);
            } else {
              uploadFolderFiles();
            }

            uploadDroppedFiles({
              files: droppedItems.files,
              type,
              accept,
              folderId,
            });
            uploadAssets(type, droppedUrls, { folderId });
          } catch (error) {
            toast.error(error instanceof Error ? error.message : String(error));
          }
        },
      })
    );
  }, [accept, allowFolderDrop, containsByType, folderId, type]);

  const dragState = Math.max(monitorState, dropTargetState);

  const shell = (
    <Flex
      ref={(element) => {
        ref.current = element;
        onElementChange?.(element);
      }}
      onPointerDown={(event) => onPointerDown?.(event, listViewportRef.current)}
      onContextMenu={onContextMenu}
      onKeyDown={onKeyDown}
      direction="column"
      css={{
        overflow: "hidden",
        paddingBlock: theme.panel.paddingBlock,
        flex: 1,
        minHeight: 0,
        position: "relative",
      }}
    >
      <Flex
        css={{ padding: theme.panel.padding }}
        gap="2"
        wrap="wrap"
        shrink={false}
      >
        <SearchField
          css={{ flexGrow: 1 }}
          {...searchProps}
          autoFocus
          placeholder="Search"
        />
        {filters}
      </Flex>
      <Separator />
      {isEmpty ? (
        <Flex
          direction="column"
          css={{ flex: 1, minHeight: 0, position: "relative" }}
        >
          {emptyContent}
          <AssetPanelState
            overlay={emptyContent !== undefined}
            message={resolvedEmptyMessage}
            active={dragState === OVER}
            description={
              emptyMessage === undefined ? dropDescription : undefined
            }
          />
        </Flex>
      ) : (
        <ScrollAreaNative
          data-asset-manager-scroll-area=""
          ref={listViewportRef}
          style={{ overflowY: "auto" }}
          css={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
          }}
        >
          {children}
        </ScrollAreaNative>
      )}
      {interactionOverlay}
      {footer}
      <Flex
        css={{
          position: "absolute",
          inset: 0,
          display: dragState !== IDLE && isEmpty === false ? "flex" : "none",
          backgroundColor: theme.colors.backgroundPanel,
          color:
            dragState === OVER
              ? theme.colors.foregroundMain
              : theme.colors.foregroundSubtle,
        }}
      >
        <AssetPanelState
          message={dropMessage}
          description={dropDescription}
          active={dragState === OVER}
        />
      </Flex>
    </Flex>
  );

  if (contextMenu === undefined) {
    return shell;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{shell}</ContextMenuTrigger>
      {contextMenu}
    </ContextMenu>
  );
};
