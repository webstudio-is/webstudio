import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { useStore } from "@nanostores/react";
import {
  Box,
  Button,
  cssVar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Flex,
  FloatingPanel,
  IconButton,
  rawTheme,
  Text,
  theme,
  toast,
  Tooltip,
} from "@webstudio-is/design-system";
import {
  BlockquoteIcon,
  BoldIcon,
  ChevronDownIcon,
  CheckboxCheckedIcon,
  HeadingIcon,
  ImageIcon,
  LinkIcon,
  ListIcon,
  MarkdownEmbedIcon,
  MinusIcon,
  RepeatGridIcon,
  SpinnerIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
} from "@webstudio-is/icons";
import {
  formatAssetName,
  inspectMdxAssetSource,
  MdxAuthoredContentConflictError,
} from "@webstudio-is/project-build/runtime";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import {
  getAssetUrl,
  getPagePath,
  isMdxFileAsset,
  type Asset,
} from "@webstudio-is/sdk";
import { CodeEditor } from "~/shared/code-editor";
import { EditorDialog, type EditorApi } from "~/shared/code-editor-base";
import {
  $assetFolders,
  $assets,
  $pages,
  $props,
  readBuilderStateStores,
} from "~/shared/sync/data-stores";
import { $authPermit } from "~/shared/nano-states";
import { AssetManager } from "~/builder/shared/asset-manager";
import {
  AssetUpload,
  updateAssetContent,
  useAssets,
} from "~/builder/shared/assets";
import {
  UrlInput,
  type UrlInputValue,
} from "~/builder/features/settings-panel/controls/url";
import {
  getTextFileEditorExtensions,
  getMdxPersistenceFeedback,
  isMarkdownAsset,
  type MdxPersistenceFeedback,
  normalizeTextFileContent,
} from "./text-file-utils";
import { MarkdownSplitView } from "./markdown-preview";
import { getAssetContentBridge } from "~/shared/asset-content-bridge.client";
import { $externalContentRoots } from "~/shared/external-content-mutations";
import type { AssetContentSessionState } from "@webstudio-is/content-engine/asset-content-session";
import {
  replaceExternalContentAssetSource,
  retryExternalContentAsset,
} from "~/shared/external-content-roots";

type TextFileState =
  | { status: "loading" }
  | { status: "loaded"; content: string }
  | { status: "error" };

const markdownActions = [
  {
    label: "Bold",
    icon: <BoldIcon />,
    template: { prefix: "**", suffix: "**", placeholder: "bold text" },
  },
  {
    label: "Italic",
    icon: <TextItalicIcon />,
    template: { prefix: "_", suffix: "_", placeholder: "italic text" },
  },
  {
    label: "Strikethrough",
    icon: <TextStrikethroughIcon />,
    template: {
      prefix: "~~",
      suffix: "~~",
      placeholder: "strikethrough text",
    },
  },
  {
    label: "Blockquote",
    icon: <BlockquoteIcon />,
    template: { prefix: "> ", placeholder: "Quote" },
  },
  {
    label: "Inline code",
    icon: (
      <Text as="span" variant="mono">
        &lt;/&gt;
      </Text>
    ),
    template: { prefix: "`", suffix: "`", placeholder: "code" },
  },
  {
    label: "Code block",
    icon: (
      <Text as="span" variant="mono">
        ```
      </Text>
    ),
    template: {
      prefix: "\n\n```\n",
      suffix: "\n```\n\n",
      placeholder: "code",
    },
  },
  {
    label: "Bulleted list",
    icon: <ListIcon fill="currentColor" />,
    template: { prefix: "- ", placeholder: "List item" },
  },
  {
    label: "Numbered list",
    icon: (
      <Text as="span" variant="mono">
        1.
      </Text>
    ),
    template: { prefix: "1. ", placeholder: "List item" },
  },
  {
    label: "Task list",
    icon: <CheckboxCheckedIcon />,
    template: { prefix: "- [ ] ", placeholder: "Task" },
  },
  {
    label: "Horizontal rule",
    icon: <MinusIcon />,
    template: { prefix: "\n\n---\n\n", placeholder: "" },
  },
  {
    label: "Table",
    icon: <RepeatGridIcon />,
    template: {
      prefix: "\n\n| Column 1 | Column 2 |\n| --- | --- |\n| ",
      suffix: " | Value |\n\n",
      placeholder: "Value",
    },
  },
];

const headingLevels = [1, 2, 3, 4, 5, 6] as const;

const MarkdownHeadingMenu = ({
  editorApiRef,
  disabled,
}: {
  editorApiRef: RefObject<EditorApi | undefined>;
  disabled: boolean;
}) => (
  <DropdownMenu>
    <Tooltip content="Heading">
      <DropdownMenuTrigger asChild>
        <IconButton
          type="button"
          aria-label="Heading"
          disabled={disabled}
          css={{ gap: theme.spacing[1], paddingInline: theme.spacing[2] }}
        >
          <HeadingIcon />
          <ChevronDownIcon size={12} />
        </IconButton>
      </DropdownMenuTrigger>
    </Tooltip>
    <DropdownMenuContent
      align="start"
      sideOffset={4}
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        editorApiRef.current?.focus();
      }}
    >
      {headingLevels.map((level) => (
        <DropdownMenuItem
          key={level}
          withIndicator={false}
          onSelect={() =>
            editorApiRef.current?.insertTemplate({
              prefix: `${"#".repeat(level)} `,
              placeholder: `Heading ${level}`,
            })
          }
        >
          Heading {level}
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
);

const MarkdownImagePicker = ({
  editorApiRef,
  disabled,
}: {
  editorApiRef: RefObject<EditorApi | undefined>;
  disabled: boolean;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <FloatingPanel
      title="Images"
      titleSuffix={<AssetUpload type="image" accept="image/*" />}
      placement="bottom-within"
      open={open}
      onOpenChange={setOpen}
      content={
        <AssetManager
          accept="image/*"
          onChange={(assetId) => {
            editorApiRef.current?.insertTemplate({
              prefix: "![",
              suffix: `](${assetId})`,
              placeholder: "alt text",
            });
            setOpen(false);
          }}
        />
      }
    >
      <IconButton
        type="button"
        aria-label="Image"
        title="Image"
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
      >
        <ImageIcon />
      </IconButton>
    </FloatingPanel>
  );
};

const getMarkdownHref = (value: UrlInputValue) => {
  if (value.type === "string" || value.type === "asset") {
    return value.value;
  }

  const pages = $pages.get();
  if (pages === undefined) {
    return "";
  }

  const pageId =
    typeof value.value === "string" ? value.value : value.value.pageId;
  if (pages.pages.has(pageId) === false) {
    return "";
  }

  const url = new URL(getPagePath(pageId, pages), "https://any-valid.url");
  if (typeof value.value === "string") {
    return url.pathname;
  }

  const section = value.value;
  const idProp = Array.from($props.get().values()).find(
    (prop) => prop.instanceId === section.instanceId && prop.name === "id"
  );
  if (idProp?.type === "string") {
    url.hash = encodeURIComponent(idProp.value);
  }
  return `${url.pathname}${url.hash}`;
};

const initialLinkValue: UrlInputValue = { type: "string", value: "" };

const MarkdownLinkPicker = ({
  editorApiRef,
  disabled,
}: {
  editorApiRef: RefObject<EditorApi | undefined>;
  disabled: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<UrlInputValue>(initialLinkValue);
  const valueRef = useRef<UrlInputValue>(initialLinkValue);

  return (
    <FloatingPanel
      title="Link"
      placement="bottom-within"
      open={open}
      onOpenChange={(open) => {
        if (open) {
          valueRef.current = initialLinkValue;
          setValue(initialLinkValue);
        }
        setOpen(open);
      }}
      content={
        open && (
          <Flex
            direction="column"
            gap={5}
            css={{ padding: theme.panel.padding }}
          >
            <UrlInput
              instanceId="markdown-link"
              prop={value}
              value={value.type === "string" ? value.value : ""}
              onChange={(value) => {
                valueRef.current = value;
                setValue(value);
              }}
            />
            <Flex justify="end">
              <Button
                color="primary"
                type="button"
                onClick={() => {
                  const href = getMarkdownHref(valueRef.current);
                  if (href === "") {
                    return;
                  }
                  editorApiRef.current?.insertTemplate({
                    prefix: "[",
                    suffix: `](${href})`,
                    placeholder: "link text",
                  });
                  setOpen(false);
                }}
              >
                Insert link
              </Button>
            </Flex>
          </Flex>
        )
      }
    >
      <IconButton
        type="button"
        aria-label="Link"
        title="Link"
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
      >
        <LinkIcon />
      </IconButton>
    </FloatingPanel>
  );
};

const MarkdownToolbar = ({
  editorApiRef,
  disabled,
  previewOpen,
  onPreviewOpenChange,
}: {
  editorApiRef: RefObject<EditorApi | undefined>;
  disabled: boolean;
  previewOpen: boolean;
  onPreviewOpenChange: (open: boolean) => void;
}) => (
  <Flex
    role="toolbar"
    aria-label="Markdown formatting"
    align="center"
    gap={2}
    css={{
      padding: theme.spacing[3],
      borderBottom: `1px solid ${cssVar("--border-default")}`,
      overflow: "hidden",
      flexShrink: 0,
      background: cssVar("--background-primary"),
    }}
  >
    <Flex
      align="center"
      gap={2}
      css={{
        minWidth: 0,
        flex: 1,
        overflowX: "auto",
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": { display: "none" },
      }}
    >
      <MarkdownHeadingMenu editorApiRef={editorApiRef} disabled={disabled} />
      {markdownActions.map(({ label, icon, template }) => (
        <Tooltip key={label} content={label}>
          <IconButton
            type="button"
            aria-label={label}
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => editorApiRef.current?.insertTemplate(template)}
          >
            {icon}
          </IconButton>
        </Tooltip>
      ))}
      <MarkdownLinkPicker editorApiRef={editorApiRef} disabled={disabled} />
      <MarkdownImagePicker editorApiRef={editorApiRef} disabled={disabled} />
    </Flex>
    <Tooltip content={previewOpen ? "Hide preview" : "Show preview"}>
      <IconButton
        type="button"
        aria-label={previewOpen ? "Hide preview" : "Show preview"}
        aria-pressed={previewOpen}
        variant={previewOpen ? "local" : "default"}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onPreviewOpenChange(previewOpen === false)}
      >
        <MarkdownEmbedIcon />
      </IconButton>
    </Tooltip>
  </Flex>
);

export const TextFileEditor = ({
  assetId,
  onOpenChange,
}: {
  assetId: string;
  onOpenChange: (open: boolean) => void;
}) => {
  const assets = useStore($assets);
  const assetFolders = useStore($assetFolders);
  const externalContentRoots = useStore($externalContentRoots);
  const asset = assets.get(assetId);
  const { assetContainers } = useAssets();
  const canEdit = useStore($authPermit) !== "view";
  const [state, setState] = useState<TextFileState>({ status: "loading" });
  const [persistenceFeedback, setPersistenceFeedback] =
    useState<MdxPersistenceFeedback>();
  const [previewOpen, setPreviewOpen] = useState(true);
  const currentAssetRef = useRef<Asset>();
  const persistedContentRef = useRef<string>();
  const requestedContentRef = useRef<string>();
  const pendingMdxSavesRef = useRef(0);
  const saveQueueRef = useRef(Promise.resolve());
  const editorApiRef = useRef<EditorApi>();
  const reportedConflictRef = useRef<string>();
  const mdxSession =
    asset !== undefined &&
    isMdxFileAsset(asset) &&
    asset.projectId !== undefined
      ? getAssetContentBridge().getContentSession?.(asset.projectId)
      : undefined;
  const languageExtensions = useMemo(
    () => {
      // The state reader below is intentionally refreshed when its external
      // Content Block context changes.
      void externalContentRoots;
      if (asset === undefined) {
        return [];
      }
      if (isMdxFileAsset(asset) === false || asset.projectId === undefined) {
        return getTextFileEditorExtensions(asset);
      }
      const projectId = asset.projectId;
      return getTextFileEditorExtensions(asset, [], async ({ source }) =>
        inspectMdxAssetSource({
          source,
          assetId,
          state: readBuilderStateStores(),
          metas: componentMetas,
          projectId,
        })
      );
    },
    // Recreate the linter after a Content Block is materialized or refreshed so
    // contextual template and content-model diagnostics are recalculated.
    [asset, assetId, externalContentRoots]
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
    setPersistenceFeedback(undefined);
    reportedConflictRef.current = undefined;

    const applySessionState = (sessionState: AssetContentSessionState) => {
      const feedback = getMdxPersistenceFeedback(sessionState);
      setPersistenceFeedback(feedback);
      if (
        feedback?.kind === "conflicting" &&
        reportedConflictRef.current !== feedback.message
      ) {
        reportedConflictRef.current = feedback.message;
        getAssetContentBridge().requireReload(feedback.message);
      }
      if (feedback?.kind !== "conflicting") {
        reportedConflictRef.current = undefined;
      }
    };

    const load = async () => {
      try {
        if (isMdxFileAsset(assetToLoad)) {
          const session = getAssetContentBridge().getContentSession?.(
            assetToLoad.projectId
          );
          if (session === undefined) {
            throw new Error("MDX content session is not available");
          }
          const opened = await session.open(assetId);
          if (controller.signal.aborted) {
            return;
          }
          currentAssetRef.current = assetToLoad;
          persistedContentRef.current = opened.source;
          requestedContentRef.current = opened.source;
          applySessionState(opened);
          setState({ status: "loaded", content: opened.source });
          return;
        }
        const response = await fetch(
          getAssetUrl(assetToLoad, window.location.origin),
          { signal: controller.signal }
        );
        if (response.ok === false) {
          throw new Error(`Unable to load asset: ${response.status}`);
        }
        const content = await response.text();
        persistedContentRef.current = content;
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
    const unsubscribe = isMdxFileAsset(assetToLoad)
      ? getAssetContentBridge()
          .getContentSession?.(assetToLoad.projectId)
          .subscribe((changedAssetId, sessionState) => {
            if (changedAssetId !== assetId || controller.signal.aborted) {
              return;
            }
            currentAssetRef.current = sessionState.asset as Asset;
            persistedContentRef.current = sessionState.source;
            applySessionState(sessionState);
            if (requestedContentRef.current === sessionState.source) {
              return;
            }
            if (pendingMdxSavesRef.current > 0) {
              return;
            }
            requestedContentRef.current = sessionState.source;
            setState({ status: "loaded", content: sessionState.source });
          })
      : undefined;
    return () => {
      controller.abort();
      unsubscribe?.();
    };
  }, [assetId]);

  const save = (content: string) => {
    if (canEdit === false) {
      return;
    }
    const currentAsset = currentAssetRef.current;
    if (currentAsset === undefined) {
      toast.error("Unable to save: asset not found");
      return;
    }
    const normalized = normalizeTextFileContent(currentAsset, content);
    if ("error" in normalized) {
      toast.error(normalized.error);
      return;
    }
    const normalizedContent = normalized.content;
    if (normalizedContent !== content) {
      setState({ status: "loaded", content: normalizedContent });
    }
    const expectedContent = requestedContentRef.current;
    requestedContentRef.current = normalizedContent;
    if (isMdxFileAsset(currentAsset) && mdxSession !== undefined) {
      if (
        expectedContent === undefined ||
        currentAsset.projectId === undefined
      ) {
        toast.error("Unable to save: MDX content is not loaded");
        return;
      }
      pendingMdxSavesRef.current += 1;
      void replaceExternalContentAssetSource({
        projectId: currentAsset.projectId,
        assetId,
        expectedSource: expectedContent,
        source: normalizedContent,
      })
        .catch((error) => {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to save this file.";
          const feedback: MdxPersistenceFeedback = {
            kind:
              error instanceof MdxAuthoredContentConflictError
                ? "conflicting"
                : "failed",
            message,
          };
          setPersistenceFeedback(feedback);
        })
        .finally(() => {
          pendingMdxSavesRef.current -= 1;
        });
      return;
    }
    saveQueueRef.current = saveQueueRef.current.then(async () => {
      const requestedContent = requestedContentRef.current;
      if (
        requestedContent === undefined ||
        requestedContent === persistedContentRef.current
      ) {
        return;
      }

      const assetToUpdate = currentAssetRef.current;
      if (assetToUpdate === undefined) {
        toast.error("Unable to save: asset not found");
        return;
      }

      try {
        const updatedAsset = await updateAssetContent({
          asset: assetToUpdate,
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
  const isMarkdown = asset !== undefined && isMarkdownAsset(asset);
  let editor: ReactNode;
  if (state.status === "loaded" && asset !== undefined) {
    editor = (
      <CodeEditor
        editorApiRef={editorApiRef}
        value={state.content}
        languageExtensions={languageExtensions}
        size="full"
        expandable={false}
        chromeless
        readOnly={canEdit === false}
        onChange={(content) => {
          setState({ status: "loaded", content });
          if (isMdxFileAsset(asset)) {
            save(content);
          }
        }}
        onChangeComplete={save}
      />
    );
  }

  return (
    <EditorDialog
      title={title}
      contentPadding={false}
      width={isMarkdown ? 1280 : undefined}
      height={isMarkdown ? 960 : undefined}
      open
      onOpenChange={(open) => {
        if (open === false && state.status === "loaded") {
          save(state.content);
        }
        onOpenChange(open);
      }}
      content={
        <Box
          data-floating-panel-container
          css={{ height: "100%", minHeight: 0 }}
        >
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
            <Box
              css={{
                display: "grid",
                gridTemplateRows: isMarkdown
                  ? persistenceFeedback === undefined
                    ? "auto minmax(0, 1fr)"
                    : "auto auto minmax(0, 1fr)"
                  : "minmax(0, 1fr)",
                height: "100%",
              }}
            >
              {persistenceFeedback !== undefined && (
                <Flex
                  gap="2"
                  align="center"
                  css={{ padding: rawTheme.spacing[5] }}
                >
                  <Text role="alert" color="destructive" variant="tiny">
                    {persistenceFeedback.message}
                  </Text>
                  {persistenceFeedback.kind === "failed" &&
                    mdxSession !== undefined && (
                      <Button
                        color="ghost"
                        onClick={() => {
                          void retryExternalContentAsset({
                            projectId: asset.projectId!,
                            assetId,
                          }).catch((error) => {
                            setPersistenceFeedback({
                              kind: "failed",
                              message:
                                error instanceof Error
                                  ? error.message
                                  : "Unable to save this file.",
                            });
                          });
                        }}
                      >
                        Retry
                      </Button>
                    )}
                </Flex>
              )}
              {isMarkdown && (
                <MarkdownToolbar
                  editorApiRef={editorApiRef}
                  disabled={canEdit === false}
                  previewOpen={previewOpen}
                  onPreviewOpenChange={setPreviewOpen}
                />
              )}
              {isMarkdown ? (
                <MarkdownSplitView
                  open={previewOpen}
                  source={state.content}
                  sourceAsset={asset}
                  folders={assetFolders}
                  assetContainers={assetContainers}
                >
                  {editor}
                </MarkdownSplitView>
              ) : (
                editor
              )}
            </Box>
          )}
        </Box>
      }
    >
      <button type="button" hidden tabIndex={-1} />
    </EditorDialog>
  );
};
