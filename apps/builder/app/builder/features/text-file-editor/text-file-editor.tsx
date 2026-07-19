import { useEffect, useRef, useState, type RefObject } from "react";
import { useStore } from "@nanostores/react";
import {
  Box,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Flex,
  rawTheme,
  Text,
  theme,
  toast,
  Toolbar,
  ToolbarButton,
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
  MinusIcon,
  RepeatGridIcon,
  SpinnerIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
} from "@webstudio-is/icons";
import { formatAssetName } from "@webstudio-is/project-build/runtime";
import type { Asset } from "@webstudio-is/sdk";
import { CodeEditor } from "~/shared/code-editor";
import { EditorDialog, type EditorApi } from "~/shared/code-editor-base";
import { $assets } from "~/shared/sync/data-stores";
import { $authPermit } from "~/shared/nano-states";
import { getAssetUrl } from "~/builder/shared/assets/asset-utils";
import { updateAssetContent } from "~/builder/shared/assets";
import {
  getTextFileEditorExtensions,
  isMarkdownAsset,
} from "./text-file-utils";

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
    label: "Link",
    icon: <LinkIcon />,
    template: {
      prefix: "[",
      suffix: "](https://)",
      placeholder: "link text",
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
    label: "Image",
    icon: <ImageIcon />,
    template: {
      prefix: "![",
      suffix: "](https://)",
      placeholder: "alt text",
    },
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

const markdownToolbarButtonStyle = {
  "&:hover": { background: theme.colors.backgroundHover },
  "&:disabled": { color: theme.colors.foregroundDisabled },
};

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
        <ToolbarButton
          asChild
          css={{ ...markdownToolbarButtonStyle, gap: theme.spacing[1] }}
        >
          <button type="button" aria-label="Heading" disabled={disabled}>
            <HeadingIcon />
            <ChevronDownIcon size={12} />
          </button>
        </ToolbarButton>
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

const MarkdownToolbar = ({
  editorApiRef,
  disabled,
}: {
  editorApiRef: RefObject<EditorApi | undefined>;
  disabled: boolean;
}) => (
  <Toolbar
    aria-label="Markdown formatting"
    css={{
      paddingInline: theme.spacing[3],
      borderBottom: `1px solid ${theme.colors.borderMain}`,
      gap: theme.spacing[1],
      overflowX: "auto",
      scrollbarWidth: "none",
      "&::-webkit-scrollbar": { display: "none" },
      flexShrink: 0,
      color: theme.colors.foregroundMain,
      background: theme.colors.backgroundControls,
    }}
  >
    <MarkdownHeadingMenu editorApiRef={editorApiRef} disabled={disabled} />
    {markdownActions.map(({ label, icon, template }) => (
      <Tooltip key={label} content={label}>
        <ToolbarButton asChild css={markdownToolbarButtonStyle}>
          <button
            type="button"
            aria-label={label}
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => editorApiRef.current?.insertTemplate(template)}
          >
            {icon}
          </button>
        </ToolbarButton>
      </Tooltip>
    ))}
  </Toolbar>
);

export const TextFileEditor = ({
  assetId,
  onOpenChange,
}: {
  assetId: string;
  onOpenChange: (open: boolean) => void;
}) => {
  const asset = useStore($assets).get(assetId);
  const canEdit = useStore($authPermit) !== "view";
  const [state, setState] = useState<TextFileState>({ status: "loading" });
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
                />
              )}
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
            </Box>
          )}
        </Box>
      }
    >
      <button type="button" hidden tabIndex={-1} />
    </EditorDialog>
  );
};
