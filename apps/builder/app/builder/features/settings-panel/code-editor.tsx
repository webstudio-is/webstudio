import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedTextNode,
  $applyNodeReplacement,
  TextNode,
  $getRoot,
  $isElementNode,
  createEditor,
  type LexicalEditor,
} from "lexical";
import { $generateNodesFromDOM } from "@lexical/html";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  useBasicTypeaheadTriggerMatch,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import {
  MenuItemButton,
  MenuList,
  css,
  textVariants,
  theme,
} from "@webstudio-is/design-system";

// mention node is based on
// https://github.com/facebook/lexical/blob/f15a17564b6267531732ba5cc824b8aaf45f5b54/packages/lexical-playground/src/nodes/MentionNode.ts

const convertMentionElement = (
  domNode: HTMLElement
): DOMConversionOutput | null => {
  const mentionText = domNode.getAttribute("data-mention-text");
  const mentionId = domNode.getAttribute("data-mention-id");

  if (mentionText !== null && mentionId !== null) {
    const node = $createMentionNode(mentionText, mentionId);
    return {
      node,
    };
  }

  return null;
};

const mentionStyle = "background-color: rgba(24, 119, 232, 0.2)";

class MentionNode extends TextNode {
  mentionText: string;
  mentionId: string;

  static getType(): string {
    return "mention";
  }

  static clone(node: MentionNode): MentionNode {
    return new MentionNode(node.mentionText, node.mentionId, node.__key);
  }

  static importJSON(): MentionNode {
    throw Error("Unimplemented");
  }

  static importDOM(): DOMConversionMap | null {
    return {
      span: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute("data-lexical-mention")) {
          return null;
        }
        return {
          conversion: convertMentionElement,
          priority: 1,
        };
      },
    };
  }

  constructor(mentionText: string, mentionId: string, key?: NodeKey) {
    super(mentionText, key);
    this.mentionText = mentionText;
    this.mentionId = mentionId;
  }

  exportJSON(): SerializedTextNode {
    throw Error("Unimplemented");
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    dom.style.cssText = mentionStyle;
    dom.className = "mention";
    return dom;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("span");
    element.setAttribute("data-lexical-mention", "true");
    element.setAttribute("data-mention-text", this.mentionText);
    element.setAttribute("data-mention-id", this.mentionId);
    element.textContent = this.__text;
    return { element };
  }

  isTextEntity(): true {
    return true;
  }

  canInsertTextBefore(): boolean {
    return false;
  }

  canInsertTextAfter(): boolean {
    return false;
  }
}

const $createMentionNode = (
  mentionText: string,
  mentionId: string
): MentionNode => {
  const mentionNode = new MentionNode(mentionText, mentionId);
  mentionNode.setMode("segmented").toggleDirectionless();
  return $applyNodeReplacement(mentionNode);
};

const $isMentionNode = (
  node: LexicalNode | null | undefined
): node is MentionNode => {
  return node instanceof MentionNode;
};

const findAllSubstrings = (text: string, substrings: string[]) => {
  const offsets = new Set<number>();
  for (const substring of substrings) {
    let index = text.indexOf(substring);
    while (index !== -1) {
      // add start and end offsets of each match
      offsets.add(index);
      offsets.add(index + substring.length);
      index = text.indexOf(substring, index + 1);
    }
  }
  return Array.from(offsets);
};

const VariableSuggestionsPlugin = ({
  variables,
}: {
  variables: Map<string, string>;
}) => {
  const [editor] = useLexicalComposerContext();
  const checkForMentionMatch = useBasicTypeaheadTriggerMatch("$", {
    minLength: 0,
  });

  const [options, setOptions] = useState<MenuOption[]>([]);

  const onQueryChange = useCallback(
    (matchingString: string | null) => {
      let matchedIds: string[] = [];
      if (matchingString == null) {
        matchedIds = Array.from(variables.keys());
      } else {
        matchedIds = Array.from(variables)
          .filter(([_id, text]) =>
            // make search case insensitive
            text.toLowerCase().includes(matchingString.toLowerCase())
          )
          .map(([id]) => id);
      }
      setOptions(matchedIds.map((id) => new MenuOption(id)));
    },
    [variables]
  );

  const onSelectOption = useCallback(
    (
      selectedOption: MenuOption,
      nodeToReplace: TextNode | null,
      closeMenu: () => void
    ) => {
      editor.update(() => {
        const mentionId = selectedOption.key;
        const mentionText = variables.get(mentionId);
        if (mentionText !== undefined) {
          const mentionNode = $createMentionNode(mentionText, mentionId);
          if (nodeToReplace) {
            nodeToReplace.replace(mentionNode);
          }
          mentionNode.select();
        }
        closeMenu();
      });
    },
    [editor, variables]
  );

  useEffect(() => {
    return editor.registerNodeTransform(TextNode, (node) => {
      const offsets = findAllSubstrings(
        node.getTextContent(),
        Array.from(variables.keys())
      );
      // stop before calling any lexical updates to avoid infinite loop
      if (offsets.length === 0) {
        return;
      }
      const nodes = node.splitText(...offsets);
      for (node of nodes) {
        const mentionId = node.getTextContent();
        const mentionText = variables.get(mentionId);
        if (mentionText !== undefined) {
          const mentionNode = $createMentionNode(mentionText, mentionId);
          node.replace(mentionNode);
        }
      }
    });
  }, [editor, variables]);

  return (
    <LexicalTypeaheadMenuPlugin<MenuOption>
      triggerFn={checkForMentionMatch}
      onQueryChange={onQueryChange}
      onSelectOption={onSelectOption}
      options={options}
      menuRenderFn={(
        anchorElementRef,
        { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }
      ) => {
        if (anchorElementRef.current === null || options.length === 0) {
          return null;
        }
        return createPortal(
          <MenuList
            // put menu below cursor
            css={{
              minWidth: 160,
              width: "max-content",
              position: "absolute",
              top: "100%",
            }}
          >
            {options.map((option, index) => (
              <MenuItemButton
                key={option.key}
                // show variable names without changes
                css={{ textTransform: "none" }}
                tabIndex={-1}
                ref={option.setRefElement}
                role="option"
                aria-selected={selectedIndex === index}
                onMouseEnter={() => {
                  setHighlightedIndex(index);
                }}
                onClick={() => {
                  setHighlightedIndex(index);
                  selectOptionAndCleanUp(option);
                }}
              >
                {variables.get(option.key)}
              </MenuItemButton>
            ))}
          </MenuList>,
          anchorElementRef.current
        );
      }}
    />
  );
};

const traverseNode = (
  node: LexicalNode,
  callback: (node: LexicalNode) => void
) => {
  callback(node);
  if ($isElementNode(node)) {
    for (const child of node.getChildren()) {
      traverseNode(child, callback);
    }
  }
};

const onError = (error: unknown) => {
  // eslint-disable-next-line no-console
  console.error(error);
};

const rootStyle = css({
  ...textVariants.mono,
  boxSizing: "border-box",
  color: theme.colors.foregroundMain,
  borderRadius: theme.borderRadius[4],
  border: `1px solid ${theme.colors.borderMain}`,
  background: theme.colors.backgroundControls,
  paddingTop: 6,
  paddingBottom: 4,
  paddingRight: theme.spacing[2],
  paddingLeft: theme.spacing[3],
  "&:focus": {
    borderColor: theme.colors.borderFocus,
    outline: `1px solid ${theme.colors.borderFocus}`,
  },
});

const paragraphStyle = css({
  marginTop: 0,
  marginBottom: 0,
});

/**
 * The main feature of code editor is to provide completion
 * with specified variables
 *
 * Could be used to edit css as well in the future.
 */
export const CodeEditor = ({
  variables,
  defaultValue,
  onChange,
  onBlur,
}: {
  variables: Map<string, string>;
  defaultValue: string;
  onChange: (newCode: string) => void;
  onBlur?: () => void;
}) => {
  const initialConfig = {
    namespace: "CodeEditor",
    nodes: [MentionNode],
    theme: {
      root: rootStyle.toString(),
      paragraph: paragraphStyle.toString(),
    },
    editorState: (editor: LexicalEditor) => {
      const root = $getRoot();
      const parser = new DOMParser();
      const dom = parser.parseFromString(`<p>${defaultValue}</p>`, "text/html");
      const nodes = $generateNodesFromDOM(editor, dom);
      root.append(...nodes);
    },
    onError,
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <PlainTextPlugin
        contentEditable={<ContentEditable onBlur={onBlur} />}
        placeholder={null}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <HistoryPlugin />
      <VariableSuggestionsPlugin variables={variables} />
      <OnChangePlugin
        onChange={(editorState) => {
          const { editorState: _editorState, ...config } = initialConfig;
          const updater = createEditor(config);
          updater.setEditorState(editorState.clone());
          updater.update(() => {
            const root = $getRoot();
            traverseNode(root, (node) => {
              if ($isMentionNode(node)) {
                node.setTextContent(node.mentionId);
              }
            });
            onChange(root.getTextContent());
          });
        }}
      />
    </LexicalComposer>
  );
};
