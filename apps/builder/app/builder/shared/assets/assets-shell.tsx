import { useEffect, useRef, useState, type ComponentProps } from "react";
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
import {
  dropTargetForExternal,
  monitorForExternal,
} from "@atlaskit/pragmatic-drag-and-drop/external/adapter";
import { preventUnhandled } from "@atlaskit/pragmatic-drag-and-drop/prevent-unhandled";
import invariant from "tiny-invariant";
import type { ContainsSource } from "@atlaskit/pragmatic-drag-and-drop/dist/types/public-utils/external/native-types";
import { canvasApi } from "~/shared/canvas-api";
import { useDebouncedCallback } from "use-debounce";
import { $canvasIframeState } from "~/shared/nano-states";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import { useUploadAsset } from "./use-assets";
import { UploadIcon } from "@webstudio-is/icons";

type AssetsShellProps = {
  searchProps: ComponentProps<typeof SearchField>;
  children: JSX.Element;
  type: AssetType;
  accept?: string;
  isEmpty: boolean;
};

const containsFilesOrUri = (parameter: ContainsSource) => {
  if (false === isFeatureEnabled("assetDragSupport")) {
    return false;
  }

  return (
    containsFiles(parameter) || parameter.source.types.includes("text/uri-list")
  );
};

const IDLE = 0;
const POTENTIAL = 1;
const OVER = 2;

type DRAG_STATE = typeof IDLE | typeof POTENTIAL | typeof OVER;

export const AssetsShell = ({
  searchProps,
  isEmpty,
  children,
  type,
  accept,
}: AssetsShellProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<DRAG_STATE>(IDLE);
  const [canvasState, setCanvasState] = useState<DRAG_STATE>(IDLE);
  const [refresh, setRefresh] = useState(0);
  const uploadAssets = useUploadAsset();

  const handleBuilderOnDrop = useDebouncedCallback(() => {
    setState(IDLE);
  }, 300);

  const handleCanvasOnDrop = useDebouncedCallback(() => {
    setCanvasState(IDLE);
  }, 300);

  const preventUnhandledStop = useDebouncedCallback(() => {
    preventUnhandled.stop();
    canvasApi.preventUnhandled.stop();
  }, 300);

  useEffect(() => {
    if (false === canvasApi.isInitialized()) {
      return $canvasIframeState.listen((state) => {
        if (state === "ready") {
          setRefresh((prev) => prev + 1);
        }
      });
    }

    const element = ref.current;

    invariant(element);

    const preventUnhandledStart = () => {
      preventUnhandled.start();
      canvasApi.preventUnhandled.start();
    };

    // Do not react if any dialog is opened above
    const isBlockedByBackdrop = (
      blocked: typeof containsFilesOrUri,
      notBlocked: typeof containsFilesOrUri
    ) => {
      return (parameter: ContainsSource) => {
        const elementRect = element.getBoundingClientRect();
        const centerX = elementRect.left + elementRect.width / 2;
        const centerY = elementRect.top + elementRect.height / 2;

        // Get the element directly under the center of the target element
        const topElement = document.elementFromPoint(centerX, centerY);

        const isNotBlocked =
          element.contains(topElement) || topElement === element;

        // Check if this element is the original element or its descendant
        return isNotBlocked ? notBlocked(parameter) : blocked(parameter);
      };
    };

    return combine(
      dropTargetForExternal({
        element: element,
        canDrop: isBlockedByBackdrop(() => false, containsFilesOrUri),
        onDragEnter: () => setState(OVER),
        onDragLeave: () => setState(POTENTIAL),
        onDrop: async ({ source }) => {
          const droppedFiles = await getFiles({ source });

          const files = droppedFiles
            .filter((file) => file != null)
            .filter((file) => {
              if (acceptUploadType(type, accept, file)) {
                return true;
              }

              // eslint-disable-next-line no-console
              console.warn(
                `Unsupported file dropped for type=${type}, accept=${accept} and file.type=${file.type}, file.name=${file.name}`
              );
              return false;
            });

          if (files.length === 0) {
            return;
          }

          uploadAssets(type, files);
        },
      }),
      monitorForExternal({
        canMonitor: isBlockedByBackdrop(() => false, containsFilesOrUri),
        onDragStart: () => {
          preventUnhandledStart();
          setState(POTENTIAL);
          handleBuilderOnDrop.cancel();
          preventUnhandledStop.cancel();
        },
        onDrop: () => {
          handleBuilderOnDrop();
          preventUnhandledStop();
        },
      }),
      canvasApi.monitorForExternal({
        canMonitor: isBlockedByBackdrop(() => false, containsFilesOrUri),
        onDragStart: () => {
          preventUnhandledStart();
          setCanvasState(POTENTIAL);
          handleCanvasOnDrop.cancel();
          preventUnhandledStop.cancel();
        },
        onDrop: () => {
          handleCanvasOnDrop();
          preventUnhandledStop();
        },
      }),
      () => {
        return () => {
          preventUnhandled.stop();
          canvasApi.preventUnhandled.stop();
        };
      }
    );
  }, [
    accept,
    handleBuilderOnDrop,
    handleCanvasOnDrop,
    preventUnhandledStop,
    refresh,
    type,
    uploadAssets,
  ]);

  const dragState = Math.max(state, canvasState);

  return (
    <Flex
      ref={ref}
      direction="column"
      css={{
        overflow: "hidden",
        py: theme.spacing[5],
        flex: 1,
        position: "relative",
      }}
    >
      <Flex
        css={{ py: theme.spacing[5], px: theme.spacing[9] }}
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
          backgroundColor: theme.colors.background,
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
