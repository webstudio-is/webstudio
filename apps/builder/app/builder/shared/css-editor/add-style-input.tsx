import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type FocusEvent,
  type KeyboardEvent,
} from "react";
import { css } from "@codemirror/lang-css";
import { EditorView, keymap } from "@codemirror/view";
import { matchSorter } from "match-sorter";
import {
  Box,
  ComboboxAnchor,
  ComboboxContent,
  ComboboxItemDescription,
  ComboboxListbox,
  ComboboxListboxItem,
  ComboboxRoot,
  ComboboxScrollArea,
  Flex,
  InputField,
  NestedInputButton,
  Text,
  theme,
  useCombobox,
} from "@webstudio-is/design-system";
import {
  propertiesData,
  shorthandProperties,
  keywordValues,
  propertyDescriptions,
  parseCssValue,
} from "@webstudio-is/css-data";
import {
  cssWideKeywords,
  generateStyleMap,
  mergeStyles,
  toValue,
  type CssProperty,
} from "@webstudio-is/css-engine";
import { composeEventHandlers } from "~/shared/event-utils";
import {
  deleteProperty,
  setProperty,
} from "~/builder/features/style-panel/shared/use-style-data";
import {
  $availableVariables,
  $cssVarsMap,
} from "~/builder/features/style-panel/shared/model";
import { parseStyleInput } from "./parse-style-input";
import { validateCssVariableName } from "~/builder/shared/css-variable-utils";
import { toast } from "@webstudio-is/design-system";
import {
  EditorContent,
  getCodeEditorCssVars,
  type EditorApi,
} from "~/shared/code-editor-base";
import {
  PropertyStatusDescription,
  PropertyStatusIcon,
} from "~/builder/features/style-panel/property-status";

type SearchItem = {
  property: string;
  label: string;
  value?: string;
  key: string;
};

const getNewPropertyDescription = (item: null | SearchItem) => {
  let description: string | undefined = "Add CSS property.";
  if (item?.property.startsWith("--")) {
    description = "Create CSS variable.";
  }
  if (item && propertyDescriptions[item.property]) {
    description = propertyDescriptions[item.property];
  }
  return (
    <Box css={{ width: theme.spacing[28] }}>
      <Flex direction="column" gap="2">
        {description}
        {item && <PropertyStatusDescription property={item.property} />}
      </Flex>
    </Box>
  );
};

const getAutocompleteItems = () => {
  const autoCompleteItems: SearchItem[] = [];
  for (const varValue of $availableVariables.get()) {
    const property = `--${varValue.value}`;
    autoCompleteItems.push({
      // consider additional properties to be custom properties
      key: property,
      property,
      label: property,
    });
  }
  for (const property in propertiesData) {
    autoCompleteItems.push({
      // Allow matching "gr te co" -> "grid-template-columns"
      key: property.replaceAll("-", " "),
      property,
      label: property,
    });
  }

  for (const property of shorthandProperties) {
    autoCompleteItems.push({
      // Allow matching "gr te co" -> "grid-template-columns"
      key: property.replaceAll("-", " "),
      property,
      label: property,
    });
  }

  const ignoreValues = new Set([...cssWideKeywords, ...keywordValues.color]);

  for (const [property, values] of Object.entries(keywordValues)) {
    for (const value of values ?? []) {
      if (ignoreValues.has(value)) {
        continue;
      }
      autoCompleteItems.push({
        // Allow matching "gr te co" -> "grid-template-columns"
        key: `${property.replaceAll("-", " ")} ${value}`,
        property,
        value,
        label: `${property}: ${value}`,
      });
    }
  }

  autoCompleteItems.sort((a, b) =>
    Intl.Collator().compare(a.property, b.property)
  );

  return autoCompleteItems;
};

const matchOrSuggestToCreate = (search: string, items: Array<SearchItem>) => {
  const searchWithSpaces = search.startsWith("--")
    ? search
    : search.replaceAll("-", " ");
  const matched = matchSorter(items, searchWithSpaces, {
    keys: ["key"],
  });

  // Limit the array to 100 elements
  matched.length = Math.min(matched.length, 100);

  if (matched.length === 0) {
    const { styleMap: parsedStyleMap } = parseStyleInput(
      search,
      $cssVarsMap.get()
    );
    const styleMap = mergeStyles(parsedStyleMap);

    // When parsedStyles is more than one, user entered a shorthand.
    // We will suggest to insert their shorthand first.
    if (styleMap.size > 1) {
      matched.push({
        key: "",
        property: search,
        label: `Create "${search}"`,
      });
    }
    // Now we will suggest to insert each longhand separately.
    for (const [property, value] of styleMap) {
      matched.push({
        key: "",
        property,
        value: toValue(value),
        label: `Create "${generateStyleMap(new Map([[property, value]]))}"`,
      });
    }
  }

  return matched;
};

/**
 * Advanced search control supports following interactions
 *
 * - find property
 * - create custom property
 * - submit css declarations
 * - paste css declarations
 *
 */
export const AddStyleInput = forwardRef<
  HTMLInputElement,
  {
    onClose: () => void;
    onSubmit: (css: string) => boolean;
    onFocus: () => void;
    onBlur: (hasDraft: boolean) => void;
    onDraftChange?: (hasDraft: boolean) => void;
    inline?: boolean;
  }
>((props, forwardedRef) => {
  const {
    onClose,
    onSubmit,
    onFocus,
    onBlur,
    onDraftChange,
    inline = false,
  } = props;
  const [item, setItem] = useState<SearchItem>({
    property: "",
    label: "",
    key: "",
  });
  const highlightedItemRef = useRef<SearchItem>();
  const [multiline, setMultiline] = useState(false);
  const [code, setCode] = useState("");
  const editorRef = useRef<EditorApi>();
  const selectionRef = useRef(0);
  const closingRef = useRef(false);
  const switchingRef = useRef(false);
  const blurringRef = useRef(false);
  const [invalidCode, setInvalidCode] = useState(false);

  useEffect(() => {
    onDraftChange?.(multiline || item.property.trim() !== "");
  }, [item.property, multiline, onDraftChange]);

  useEffect(() => {
    if (multiline) {
      editorRef.current?.setSelection(selectionRef.current);
      switchingRef.current = false;
    }
  }, [multiline]);

  const codeExtensions = useMemo(
    () => [
      css(),
      keymap.of([
        {
          key: "Enter",
          run(view) {
            const { from, to } = view.state.selection.main;
            if (from !== to || to !== view.state.doc.length) {
              return false;
            }
            const content = view.state.doc.toString();
            const { styleMap, errors, hasSyntaxErrors } = parseStyleInput(
              content,
              $cssVarsMap.get()
            );
            if (
              styleMap.size === 0 ||
              errors.length > 0 ||
              hasSyntaxErrors ||
              [...styleMap.values()].some((value) => value.type === "invalid")
            ) {
              return false;
            }
            const trimmedLength = content.trimEnd().length;
            if (content.slice(0, trimmedLength).endsWith(";")) {
              view.dispatch({
                changes: { from, insert: "\n" },
                selection: { anchor: from + 1 },
              });
            } else {
              view.dispatch({
                changes: [
                  { from: trimmedLength, insert: ";" },
                  { from, insert: "\n" },
                ],
                selection: { anchor: from + 2 },
              });
            }
            return true;
          },
        },
      ]),
      EditorView.domEventHandlers({
        keydown(event) {
          if (event.key === "Escape") {
            event.preventDefault();
            closingRef.current = true;
            clear();
            onClose();
          }
        },
      }),
    ],
    [onClose]
  );

  const openMultiline = (value: string, selection: number) => {
    closingRef.current = false;
    switchingRef.current = true;
    selectionRef.current = selection;
    setCode(value);
    setMultiline(true);
  };

  const combobox = useCombobox<SearchItem>({
    getItems: getAutocompleteItems,
    itemToString: (item) => item?.label ?? "",
    value: item,
    getItemProps: () => ({ text: "sentence" }),
    match: matchOrSuggestToCreate,
    onChange: (input) => {
      if (input === undefined && blurringRef.current) {
        return;
      }
      blurringRef.current = false;
      return setItem({
        property: input ?? "",
        label: input ?? "",
        key: input ?? "",
      });
    },
    onItemSelect: (item) => {
      // When there is no value, property can be:
      // - property without value: gap
      // - declaration with value: gap: 10px
      // - block: gap: 10px; margin: 20px;
      if (item.value === undefined) {
        if (onSubmit(item.property)) {
          clear();
        }
        return;
      }
      if (onSubmit(`${item.property}: ${item.value}`)) {
        clear();
      }
    },
    onItemHighlight: (item) => {
      const previousHighlightedItem = highlightedItemRef.current;
      if (item?.value === undefined && previousHighlightedItem) {
        deleteProperty(previousHighlightedItem.property as CssProperty, {
          isEphemeral: true,
        });
        highlightedItemRef.current = undefined;
        return;
      }

      if (item?.value) {
        const value = parseCssValue(item.property as CssProperty, item.value);
        setProperty(item.property as CssProperty)(value, {
          isEphemeral: true,
        });
        highlightedItemRef.current = item;
      }
    },
  });

  const descriptionItem = combobox.items[combobox.highlightedIndex];
  const description = getNewPropertyDescription(descriptionItem);
  const descriptions = combobox.items.map(getNewPropertyDescription);
  const inputProps = combobox.getInputProps();

  const clear = () => {
    blurringRef.current = false;
    setItem({ property: "", label: "", key: "" });
    setCode("");
    setMultiline(false);
    setInvalidCode(false);
  };

  const handleEnter = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      const property = item.property.split(":")[0].trim();

      // Validate CSS variable names before creating them
      if (property.startsWith("--")) {
        const error = validateCssVariableName(property);
        if (error) {
          // For duplicate variables, show warning and continue updating the values
          if (error.type === "duplicate") {
            toast.warn(
              `CSS variable "${property}" already exists. Its value will be updated.`
            );
          } else {
            // Show error via toast and block submission
            toast.error(error.message);
            return;
          }
        }
      }

      if (onSubmit(item.property)) {
        clear();
      }
    }
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && event.shiftKey) {
      event.preventDefault();
      const input = event.currentTarget;
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? start;
      openMultiline(
        `${input.value.slice(0, start)}\n${input.value.slice(end)}`,
        start + 1
      );
      return;
    }
    handleKeyDown(event);
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData("text/plain");
    if (!text.includes("\n") && !text.includes("\r")) {
      return;
    }
    event.preventDefault();
    const input = event.currentTarget;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    const pasted = text.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
    openMultiline(
      `${input.value.slice(0, start)}${pasted}${input.value.slice(end)}`,
      start + pasted.length
    );
  };

  const handleEscape = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      clear();
      onClose();
    }
  };

  const handleDelete = (event: KeyboardEvent) => {
    // When user hits backspace and there is nothing in the input - we hide the input
    if (event.key === "Backspace" && combobox.inputValue === "") {
      clear();
      onClose();
    }
  };

  const handleKeyDown = composeEventHandlers([
    inputProps.onKeyDown,
    handleEnter,
    handleEscape,
    handleDelete,
  ]);

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    blurringRef.current = true;
    inputProps.onBlur?.(event);
    // The shared combobox resets its input after blur. Its reset is ignored
    // until the user focuses or changes this input again.
    // A click on a suggestion blurs the input before the selection is handled.
    if (combobox.isOpen === false && !switchingRef.current) {
      onBlur(item.property.trim() !== "");
    }
  };

  if (multiline) {
    return (
      <Box css={getCodeEditorCssVars({ minHeight: "4lh", maxHeight: "10lh" })}>
        <EditorContent
          ariaLabel="Add styles"
          editorApiRef={editorRef}
          autoFocus
          invalid={invalidCode}
          extensions={codeExtensions}
          value={code}
          onChange={(value) => {
            if (!value.includes("\n")) {
              closingRef.current = true;
              selectionRef.current = value.length;
              setItem({ property: value, label: value, key: value });
              setMultiline(false);
              requestAnimationFrame(() => {
                const input =
                  forwardedRef && typeof forwardedRef !== "function"
                    ? forwardedRef.current
                    : undefined;
                input?.focus();
                input?.setSelectionRange(
                  selectionRef.current,
                  selectionRef.current
                );
              });
              return;
            }
            setCode(value);
            setInvalidCode(false);
          }}
          onChangeComplete={(value) => {
            if (closingRef.current) {
              closingRef.current = false;
              return;
            }
            if (value.trim() !== "") {
              if (onSubmit(value)) {
                clear();
              } else {
                setInvalidCode(true);
              }
            } else {
              clear();
              onBlur(false);
            }
          }}
        />
      </Box>
    );
  }

  return (
    <ComboboxRoot open={combobox.isOpen}>
      <div {...combobox.getComboboxProps()}>
        <ComboboxAnchor>
          <InputField
            {...inputProps}
            variant={inline ? "chromeless" : undefined}
            text={inline ? "mono" : undefined}
            fieldSizing={inline ? "content" : undefined}
            aria-label="Add styles"
            onFocus={() => {
              blurringRef.current = false;
              onFocus();
            }}
            onBlur={handleBlur}
            inputRef={forwardedRef}
            onKeyDown={handleInputKeyDown}
            onPaste={handlePaste}
            placeholder="Add styles"
            suffix={<NestedInputButton {...combobox.getToggleButtonProps()} />}
          />
        </ComboboxAnchor>
        <ComboboxContent>
          <ComboboxListbox {...combobox.getMenuProps()}>
            <ComboboxScrollArea>
              {combobox.items.map((item, index) => (
                <ComboboxListboxItem
                  {...combobox.getItemProps({ item, index })}
                  key={index}
                >
                  <Flex align="center" gap="1">
                    <Text variant="labels" truncate css={{ maxWidth: "25ch" }}>
                      {item.label}
                    </Text>
                    <PropertyStatusIcon property={item.property} />
                  </Flex>
                </ComboboxListboxItem>
              ))}
            </ComboboxScrollArea>
            {description && (
              <ComboboxItemDescription descriptions={descriptions}>
                {description}
              </ComboboxItemDescription>
            )}
          </ComboboxListbox>
        </ComboboxContent>
      </div>
    </ComboboxRoot>
  );
});
