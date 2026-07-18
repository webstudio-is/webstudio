import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import { Box, Flex, rawTheme, Text, toast } from "@webstudio-is/design-system";
import { SpinnerIcon } from "@webstudio-is/icons";
import { formatAssetName } from "@webstudio-is/project-build/runtime";
import type { Asset } from "@webstudio-is/sdk";
import { CodeEditor } from "~/shared/code-editor";
import { EditorDialog } from "~/shared/code-editor-base";
import { $assets } from "~/shared/sync/data-stores";
import { $authPermit } from "~/shared/nano-states";
import { getAssetUrl } from "~/builder/shared/assets/asset-utils";
import { updateAssetContent } from "~/builder/shared/assets";
import { getTextFileEditorExtensions } from "./text-file-utils";

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
  const canEdit = useStore($authPermit) !== "view";
  const asset = assets.get(assetId);
  const [state, setState] = useState<TextFileState>({ status: "loading" });
  const currentAssetRef = useRef<Asset>();
  const persistedContentRef = useRef<string>();
  const requestedContentRef = useRef<string>();
  const saveQueueRef = useRef(Promise.resolve());
  const languageExtensions = useMemo(
    () => (asset === undefined ? [] : getTextFileEditorExtensions(asset)),
    [asset]
  );

  useEffect(() => {
    const assetToLoad = $assets.get().get(assetId);
    if (assetToLoad === undefined) {
      setState({ status: "error" });
      return;
    }
    currentAssetRef.current = assetToLoad;

    const controller = new AbortController();
    setState({ status: "loading" });

    const load = async () => {
      try {
        const response = await fetch(
          getAssetUrl(assetToLoad, window.location.origin),
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
  }, [assetId]);

  const save = (content: string) => {
    if (canEdit === false) {
      return;
    }
    requestedContentRef.current = content;
    saveQueueRef.current = saveQueueRef.current.then(async () => {
      const requestedContent = requestedContentRef.current;
      if (
        requestedContent === undefined ||
        requestedContent === persistedContentRef.current
      ) {
        return;
      }

      const currentAsset = currentAssetRef.current;
      if (currentAsset === undefined) {
        toast.error("Unable to save: asset not found");
        return;
      }

      try {
        const updatedAsset = await updateAssetContent({
          asset: currentAsset,
          content: requestedContent,
        });
        currentAssetRef.current = updatedAsset;
        persistedContentRef.current = requestedContent;
        toast.success("File saved successfully");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to save");
      }
    });
  };

  const title = asset === undefined ? "Text file" : formatAssetName(asset);

  return (
    <EditorDialog
      title={title}
      open
      onOpenChange={(open) => {
        if (open === false && state.status === "loaded") {
          save(state.content);
        }
        onOpenChange(open);
      }}
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
              languageExtensions={languageExtensions}
              size="full"
              expandable={false}
              readOnly={canEdit === false}
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
