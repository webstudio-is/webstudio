import { useEffect, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import { Box, Flex, rawTheme, Text, toast } from "@webstudio-is/design-system";
import { SpinnerIcon } from "@webstudio-is/icons";
import { formatAssetName } from "@webstudio-is/project-build/runtime";
import { getMimeTypeByExtension } from "@webstudio-is/sdk";
import { CodeEditor } from "~/shared/code-editor";
import { EditorDialog } from "~/shared/code-editor-base";
import { $assets } from "~/shared/sync/data-stores";
import { getAssetUrl } from "~/builder/shared/assets/asset-utils";
import { replaceAsset } from "~/builder/shared/assets";
import { getTextFileEditorLanguage } from "./text-file-utils";

type TextFileState =
  | { status: "loading" }
  | { status: "loaded"; content: string }
  | { status: "error" };

export const TextFileEditor = ({
  assetId,
  onOpenChange,
}: {
  assetId: string;
  onOpenChange: (open: boolean) => void;
}) => {
  const assets = useStore($assets);
  const [currentAssetId, setCurrentAssetId] = useState(assetId);
  const currentAssetIdRef = useRef(assetId);
  const asset = assets.get(currentAssetId);
  const [state, setState] = useState<TextFileState>({ status: "loading" });
  const persistedContentRef = useRef<string>();
  const requestedContentRef = useRef<string>();
  const saveQueueRef = useRef(Promise.resolve());

  useEffect(() => {
    if (asset === undefined) {
      setState({ status: "error" });
      return;
    }

    const controller = new AbortController();
    setState({ status: "loading" });

    const load = async () => {
      try {
        const response = await fetch(
          getAssetUrl(asset, window.location.origin),
          { signal: controller.signal }
        );
        if (response.ok === false) {
          throw new Error(`Unable to load asset: ${response.status}`);
        }
        const content = await response.text();
        persistedContentRef.current = content;
        requestedContentRef.current = content;
        setState({ status: "loaded", content });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        setState({ status: "error" });
        toast.error(
          error instanceof Error ? error.message : "Unable to load asset"
        );
      }
    };

    void load();
    return () => controller.abort();
  }, [asset]);

  const save = (content: string) => {
    requestedContentRef.current = content;
    saveQueueRef.current = saveQueueRef.current.then(async () => {
      const requestedContent = requestedContentRef.current;
      if (
        requestedContent === undefined ||
        requestedContent === persistedContentRef.current
      ) {
        return;
      }

      const currentAsset = $assets.get().get(currentAssetIdRef.current);
      if (currentAsset === undefined) {
        toast.error("Unable to save: asset not found");
        return;
      }

      const file = new File([requestedContent], formatAssetName(currentAsset), {
        type: getMimeTypeByExtension(currentAsset.format) ?? "text/plain",
      });
      let newAssetId: string | undefined;
      try {
        newAssetId = await replaceAsset(currentAsset.id, file, {
          type: "file",
          successMessage: "File saved successfully",
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to save");
        return;
      }
      if (newAssetId === undefined) {
        return;
      }

      persistedContentRef.current = requestedContent;
      currentAssetIdRef.current = newAssetId;
      setCurrentAssetId(newAssetId);
    });
  };

  const title = asset === undefined ? "Text file" : formatAssetName(asset);

  return (
    <EditorDialog
      title={title}
      open
      onOpenChange={onOpenChange}
      content={
        <Box css={{ height: "100%", minHeight: 0 }}>
          {state.status === "loading" && (
            <Flex align="center" justify="center" css={{ height: "100%" }}>
              <SpinnerIcon size={rawTheme.spacing[15]} />
            </Flex>
          )}
          {state.status === "error" && (
            <Flex align="center" justify="center" css={{ height: "100%" }}>
              <Text color="subtle">Unable to load this file.</Text>
            </Flex>
          )}
          {state.status === "loaded" && asset !== undefined && (
            <CodeEditor
              value={state.content}
              lang={getTextFileEditorLanguage(asset)}
              size="full"
              expandable={false}
              onChange={(content) => {
                setState({ status: "loaded", content });
              }}
              onChangeComplete={save}
            />
          )}
        </Box>
      }
    >
      <button type="button" hidden tabIndex={-1} />
    </EditorDialog>
  );
};
