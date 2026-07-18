import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import {
  Box,
  Flex,
  IconButton,
  rawTheme,
  Text,
  theme,
  toast,
} from "@webstudio-is/design-system";
import { SpinnerIcon, XIcon } from "@webstudio-is/icons";
import { formatAssetName } from "@webstudio-is/project-build/runtime";
import { CodeEditor } from "~/shared/code-editor";
import { $assets } from "~/shared/sync/data-stores";
import { getAssetUrl } from "~/builder/shared/assets/asset-utils";
import { $openedTextAssetId } from "~/builder/shared/nano-states";
import { getTextFileEditorLanguage } from "./text-file-utils";

type TextFileState =
  | { status: "loading" }
  | { status: "loaded"; content: string }
  | { status: "error" };

export const TextFileEditor = ({ assetId }: { assetId: string }) => {
  const assets = useStore($assets);
  const asset = assets.get(assetId);
  const [state, setState] = useState<TextFileState>({ status: "loading" });

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
        setState({ status: "loaded", content: await response.text() });
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

  const title = asset === undefined ? "Text file" : formatAssetName(asset);

  return (
    <Flex
      direction="column"
      css={{ height: "100%", background: theme.colors.backgroundPanel }}
    >
      <Flex
        align="center"
        justify="between"
        css={{
          minHeight: theme.sizes.controlHeight,
          px: 2,
          borderBottom: `1px solid ${theme.colors.borderMain}`,
        }}
      >
        <Text variant="labels">{title}</Text>
        <IconButton
          aria-label="Close text editor"
          onClick={() => $openedTextAssetId.set(undefined)}
        >
          <XIcon />
        </IconButton>
      </Flex>
      <Box css={{ flexGrow: 1, minHeight: 0 }}>
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
            readOnly
            onChange={() => {}}
            onChangeComplete={() => {}}
          />
        )}
      </Box>
    </Flex>
  );
};
