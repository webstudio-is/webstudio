import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { useStore } from "@nanostores/react";
import {
  Box,
  Button,
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
import { formatAssetName } from "@webstudio-is/project-build/runtime";
import { getPagePath, type Asset } from "@webstudio-is/sdk";
import { CodeEditor } from "~/shared/code-editor";
import { EditorDialog, type EditorApi } from "~/shared/code-editor-base";
import { $assets, $pages, $props } from "~/shared/sync/data-stores";
import { $authPermit } from "~/shared/nano-states";
import { AssetManager } from "~/builder/shared/asset-manager";
import { getAssetUrl } from "~/builder/shared/assets/asset-utils";
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
  isMarkdownAsset,
} from "./text-file-utils";
import { MarkdownSplitView } from "./markdown-preview";

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
      borderBottom: `1px solid ${theme.colors.borderMain}`,
      overflow: "hidden",
      flexShrink: 0,
      background: theme.colors.backgroundPanel,
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
  const asset = assets.get(assetId);
  const { assetContainers } = useAssets();
  const canEdit = useStore($authPermit) !== "view";
  const [state, setState] = useState<TextFileState>({ status: "loading" });
  const [previewOpen, setPreviewOpen] = useState(false);
  const currentAssetRef = useRef<Asset>();
  const persistedContentRef = useRef<string>();
  const requestedContentRef = useRef<string>();
  const saveQueueRef = useRef(Promise.resolve());
  const editorApiRef = useRef<EditorApi>();

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
  const isMarkdown = asset !== undefined && isMarkdownAsset(asset);
  let editor: ReactNode;
  if (state.status === "loaded" && asset !== undefined) {
    editor = (
      <CodeEditor
        editorApiRef={editorApiRef}
        value={state.content}
        languageExtensions={getTextFileEditorExtensions(asset)}
        size="full"
        expandable={false}
        showBorder={false}
        readOnly={canEdit === false}
        onChange={(content) => {
          setState({ status: "loaded", content });
        }}
        onChangeComplete={save}
      />
    );
  }

  return (
    <EditorDialog
      title={title}
      contentPadding={false}
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
                  ? "auto minmax(0, 1fr)"
                  : "minmax(0, 1fr)",
                height: "100%",
              }}
            >
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
