import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type JSX,
} from "react";
import type { AssetType } from "@webstudio-is/asset-uploader";
import {
  Flex,
  ScrollArea,
  SearchField,
  Text,
  theme,
} from "@webstudio-is/design-system";
import { AssetUpload, acceptUploadType } from "./asset-upload";
import { NotFound } from "./not-found";
import { Separator } from "./separator";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
  containsFiles,
  getFiles,
} from "@atlaskit/pragmatic-drag-and-drop/external/file";
import { dropTargetForExternal } from "@atlaskit/pragmatic-drag-and-drop/external/adapter";
import invariant from "tiny-invariant";
import type { ContainsSource } from "@atlaskit/pragmatic-drag-and-drop/dist/types/public-utils/external/native-types";
import { uploadAssets } from "./use-assets";
import { UploadIcon } from "@webstudio-is/icons";
import {
  IDLE,
  isBlockedByBackdrop,
  registerDrop,
  useExternalDragStateEffect,
  type ExternalMonitorDragState,
} from "./drag-monitor";

type AssetsShellProps = {
  searchProps: ComponentProps<typeof SearchField>;
  children: JSX.Element;
  type: AssetType;
  accept?: string;
  isEmpty: boolean;
};

const containsFilesOrUri = (parameter: ContainsSource) => {
  return (
    containsFiles(parameter) || parameter.source.types.includes("text/uri-list")
  );
};

const OVER = 2;
type DropTargetState = typeof IDLE | typeof OVER;

export const AssetsShell = ({
  searchProps,
  isEmpty,
  children,
  type,
  accept,
}: AssetsShellProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [monitorState, setMonitorState] =
    useState<ExternalMonitorDragState>(IDLE);

  const [dropTargetState, setDropTargetState] = useState<DropTargetState>(IDLE);

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

          const droppedUrls = await Promise.all(
            source.items
              .filter((item) => item.type === "text/uri-list")
              .map(
                (item) =>
                  new Promise<URL>((resolve) =>
                    item.getAsString((str) => resolve(new URL(str)))
                  )
              )
          );

          const droppedFiles = await getFiles({ source });

          const files = droppedFiles
            .filter((file) => file != null)
            .filter((file) => {
              if (acceptUploadType(type, accept, file)) {
                return true;
              }

              console.warn(
                `Unsupported file dropped for type=${type}, accept=${accept} and file.type=${file.type}, file.name=${file.name}`
              );
              return false;
            });

          uploadAssets(type, files);
          uploadAssets(type, droppedUrls);
        },
      })
    );
  }, [accept, containsByType, type]);

  const dragState = Math.max(monitorState, dropTargetState);

  return (
    <Flex
      ref={ref}
      direction="column"
      css={{
        overflow: "hidden",
        paddingBlock: theme.panel.paddingBlock,
        flex: 1,
        position: "relative",
      }}
    >
      <Flex
        css={{ padding: theme.panel.padding }}
        gap="2"
        direction="column"
        shrink={false}
      >
        <AssetUpload type={type} accept={accept} />
        <SearchField {...searchProps} autoFocus placeholder="Search" />
      </Flex>
      <Separator />
      {isEmpty && <NotFound />}
      <ScrollArea css={{ display: "flex", flexDirection: "column" }}>
        {children}
      </ScrollArea>
      <Flex
        css={{
          position: "absolute",
          inset: 0,
          display: dragState !== IDLE ? "flex" : "none",
          backgroundColor: theme.colors.backgroundPanel,
          opacity: 0.85,
          color:
            dragState === OVER
              ? theme.colors.foregroundMain
              : theme.colors.foregroundSubtle,
        }}
      >
        <Flex
          align="center"
          justify="center"
          css={{
            position: "absolute",
            inset: theme.spacing[4],
            border: `2px dashed ${dragState === OVER ? theme.colors.foregroundMain : theme.colors.foregroundMoreSubtle}`,
          }}
        >
          <Flex align={"center"} gap={1}>
            <UploadIcon />

            <Text variant={"regularBold"}>Drop files here</Text>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
};
