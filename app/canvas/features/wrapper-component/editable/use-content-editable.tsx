import { useState, useRef, useEffect, useCallback } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import useDebounce from "react-use/lib/useDebounce";
import ObjectId from "bson-objectid";
import { type ChildrenUpdates, type Instance } from "@webstudio-is/sdk";
import { type OnChangeChildren } from "~/shared/tree-utils";
import { primitives } from "~/shared/component";
import { useSelectedInstance } from "~/canvas/shared/nano-values";
import { useEditable, type Content } from "./use-editable";
import { useToolbar } from "./use-toolbar";

type ContentItem = {
  textContent: Node["textContent"];
  dataset?: { [key: string]: string | undefined };
};
type EditableContent = Content<ContentItem>;

// Converting DOM to a data structure
const serialize = (element: HTMLElement): EditableContent => {
  const queue: Node[] = element.firstChild ? [element.firstChild] : [];
  const items: Array<ContentItem> = [];
  let node: Node | undefined;
  while ((node = queue.pop())) {
    if (node.nextSibling) queue.push(node.nextSibling);
    if (node.firstChild) queue.push(node.firstChild);

    if (node.textContent === null) continue;
    if (node.nodeType === Node.TEXT_NODE) {
      const dataset = { ...node.parentElement?.dataset };
      const lastItem = items[items.length - 1];

      // Text node inside the element doesn't need it's parents dataset
      if (node.parentElement === element) {
        items.push({ textContent: node.textContent });
        continue;
      }

      // We are handling a separate text node of the same parent,
      // we can safely merge them together
      if (dataset.id === lastItem?.dataset?.id) {
        lastItem.textContent += node.textContent;
        continue;
      }

      // Webstudio instance
      items.push({
        textContent: node.textContent,
        dataset,
      });
      continue;
    }

    if (node.nodeName === "BR") {
      items.push({ textContent: "\n" });
    }
  }

  return {
    items,
    toString() {
      return this.items.map((item) => item.textContent).join("");
    },
  };
};

// Converting serialized content to updates array
const toUpdates = (items: Array<ContentItem>): ChildrenUpdates => {
  const updates: ChildrenUpdates = [];
  for (const { dataset, textContent } of items) {
    if (textContent === null) continue;

    // It is a text node
    if (dataset === undefined) {
      updates.push(textContent);
      continue;
    }

    // A new instance, where id needs to be defined
    if (dataset.id === "tbd") {
      updates.push({
        id: ObjectId().toString(),
        component: dataset.component as Instance["component"],
        text: textContent,
        createInstance: true,
      });
      continue;
    }

    updates.push({
      id: dataset.id as Instance["id"],
      text: textContent,
    });
  }
  return updates;
};

const nodeTypeComponentMap = {
  a: "Link",
  b: "Bold",
  i: "Italic",
} as const;

const createPlaceholder = (
  nodeType: keyof typeof nodeTypeComponentMap,
  text: string
): HTMLElement => {
  const element = document.createElement(nodeType);
  if (element instanceof HTMLAnchorElement) element.href = "";
  element.textContent = text;
  element.dataset.id = "tbd";
  element.dataset.component = nodeTypeComponentMap[nodeType];
  return element;
};

export const useContentEditable = ({
  id,
  component,
  children,
  onChangeChildren,
}: {
  id: Instance["id"];
  component: Instance["component"];
  children: Array<JSX.Element | string>;
  onChangeChildren?: OnChangeChildren;
}) => {
  const { isContentEditable } = primitives[component];
  const [isDisabled, setIsDisabled] = useState<boolean>(true);
  const ref = useRef<HTMLDivElement>();
  const [selectedInstance] = useSelectedInstance();
  const innerHtmlRef = useRef<{ __html: string }>();
  const [contentChanged, setContentChanged] = useState<unknown>();

  const handleChangeContent = () => {
    if (ref.current === undefined) return;
    const { items } = serialize(ref.current);
    const updates = toUpdates(items);
    if (onChangeChildren) {
      onChangeChildren({
        instanceId: id,
        updates,
      });
    }
  };

  const [isChangeContentDebounceReady] = useDebounce(
    () => {
      if (contentChanged !== undefined) {
        handleChangeContent();
      }
    },
    1000,
    [contentChanged]
  );

  const toggleDisable = useCallback(
    (nextIsDisabled: boolean) => {
      if (isContentEditable !== false && isDisabled !== nextIsDisabled) {
        if (nextIsDisabled === false) {
          innerHtmlRef.current = { __html: ref.current?.innerHTML || "" };
        } else {
          innerHtmlRef.current = undefined;
        }
        setIsDisabled(nextIsDisabled);
      }
    },
    [isContentEditable, isDisabled]
  );

  const editable = useEditable<ContentItem>(ref, handleChangeContent, {
    disabled: isDisabled,
    serialize,
  });

  // @todo move useHotKeys, it doesn't apply to that specific instance,its global
  useHotkeys(
    "enter",
    (event) => {
      // We only want to do this if the component is the one that was clicked
      // @todo this logic shouldn't be necessary
      if (selectedInstance?.id !== id) return;
      // Prevent inserting a newline when you want to start editing mode
      event.preventDefault();
      toggleDisable(false);
    },
    [toggleDisable, id, selectedInstance]
  );

  useHotkeys(
    "esc",
    () => {
      toggleDisable(true);
    },
    { enableOnContentEditable: true },
    [toggleDisable]
  );

  useEffect(() => {
    if (selectedInstance?.id !== id) {
      toggleDisable(true);
    }
  }, [selectedInstance, id, toggleDisable]);

  const toolbar = useToolbar({
    editable: isContentEditable && isDisabled === false ? editable : undefined,
    onInsert({ type, text }) {
      if (ref.current === undefined) return;
      const element = createPlaceholder(type, text);
      editable.insert(element);
      handleChangeContent();
    },
  });

  return {
    isDisabled,
    ref,
    toolbar,
    ...(isDisabled
      ? { children }
      : { dangerouslySetInnerHTML: innerHtmlRef.current, children: undefined }),
    onBlur() {
      // We only want to do this if the component is the one that was clicked
      // @todo this logic shouldn't be necessary
      if (selectedInstance?.id !== id) return;

      // When toolbar is open we don't want to disable editable
      // even though we lost focus
      if (toolbar !== null) return;
      toggleDisable(true);
    },
    onDoubleClick() {
      // We only want to do this if the component is the one that was clicked
      // @todo this logic shouldn't be necessary
      if (selectedInstance?.id !== id) return;
      toggleDisable(false);
    },
    onInput: () => {
      // We only want to do this if the component is the one that was clicked
      // @todo this logic shouldn't be necessary
      if (selectedInstance?.id !== id) return;
      if (isDisabled) return;

      // Makes sure we call it right away the first time because user can disable editable before we updated
      // children and this would revert rendered changes visually
      if (isChangeContentDebounceReady()) handleChangeContent();
      // We have to do this trick because content has to be serialized later
      // so we don't know yet what the content is right here.
      setContentChanged({});
    },
  };
};
