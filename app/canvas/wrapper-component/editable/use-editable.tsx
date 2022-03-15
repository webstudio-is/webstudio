/* eslint-disable @typescript-eslint/no-non-null-assertion, react-hooks/exhaustive-deps, react-hooks/rules-of-hooks */
// Copied from https://github.com/FormidableLabs/use-editable
// @todo create an issue there and if they agree - contribute
// @todo had too many bugs and had to resort to an uncontrolled mode over innerHTML. It totally defeats the idea behind this code
// but I left it here for now, maybe we can make it work later the way it was originally designed.

// Main idea behind changes - ability to serialize dom nodes along with dataset, not just textContent.
// opts.serialize is a custom serializer that allows any serialization, potentially having just an id
// from data would be enough to back it with any data from outside by matching with that id,
// so it doesn't have to be a custom serializer if maintainers agree to have a built-in data serialization

import { useState, useLayoutEffect, useMemo } from "react";

export interface Position {
  position: number;
  extent: number;
  content: string;
  line: number;
}

type History<Item> = [Position, Content<Item>];

const observerSettings = {
  characterData: true,
  characterDataOldValue: true,
  childList: true,
  subtree: true,
};

const getCurrentRange = () => window.getSelection()!.getRangeAt(0)!;

const setCurrentRange = (range: Range) => {
  const selection = window.getSelection()!;
  selection.empty();
  selection.addRange(range);
};

const isUndoRedoKey = (event: KeyboardEvent): boolean =>
  (event.metaKey || event.ctrlKey) && !event.altKey && event.code === "KeyZ";

const setStart = (range: Range, node: Node, offset: number) => {
  if (offset < node.textContent!.length) {
    range.setStart(node, offset);
  } else {
    range.setStartAfter(node);
  }
};

const setEnd = (range: Range, node: Node, offset: number) => {
  if (offset < node.textContent!.length) {
    range.setEnd(node, offset);
  } else {
    range.setEndAfter(node);
  }
};

const getPosition = (element: HTMLElement): Position => {
  // Firefox Quirk: Since plaintext-only is unsupported the position
  // of the text here is retrieved via a range, rather than traversal
  // as seen in makeRange()
  const range = getCurrentRange();
  const extent = !range.collapsed ? range.toString().length : 0;
  const untilRange = document.createRange();
  untilRange.setStart(element, 0);
  untilRange.setEnd(range.startContainer, range.startOffset);
  let content = untilRange.toString();
  const position = content.length;
  const lines = content.split("\n");
  const line = lines.length - 1;
  content = lines[line];
  return { position, extent, content, line };
};

const makeRange = (
  element: HTMLElement,
  start: number,
  end?: number
): Range => {
  if (start <= 0) start = 0;
  if (!end || end < 0) end = start;

  const range = document.createRange();
  const queue: Node[] = [element.firstChild!];
  let current = 0;

  let node: Node;
  let position = start;
  while ((node = queue[queue.length - 1])) {
    if (node.nodeType === Node.TEXT_NODE) {
      const length = node.textContent!.length;
      if (current + length >= position) {
        const offset = position - current;
        if (position === start) {
          setStart(range, node, offset);
          if (end !== start) {
            position = end;
            continue;
          } else {
            break;
          }
        } else {
          setEnd(range, node, offset);
          break;
        }
      }

      current += node.textContent!.length;
    } else if (node.nodeType === Node.ELEMENT_NODE && node.nodeName === "BR") {
      if (current + 1 >= position) {
        if (position === start) {
          setStart(range, node, 0);
          if (end !== start) {
            position = end;
            continue;
          } else {
            break;
          }
        } else {
          setEnd(range, node, 0);
          break;
        }
      }

      current++;
    }

    queue.pop();
    if (node.nextSibling) queue.push(node.nextSibling);
    if (node.firstChild) queue.push(node.firstChild);
  }

  return range;
};

interface State<Item> {
  observer: MutationObserver;
  disconnected: boolean;
  onChange(content: Content<Item>, position: Position): void;
  queue: MutationRecord[];
  history: Array<History<Item>>;
  historyAt: number;
  position: Position | null;
}

export interface Content<Item> {
  items: Array<Item>;
  toString: () => string;
}

export interface Options<Item> {
  disabled?: boolean;
  indentation?: number;
  serialize: (element: HTMLElement) => Content<Item>;
}

export interface Edit<Item> {
  /** Replaces the entire content of the editable while adjusting the caret position. */
  update(content: string): void;
  /** Inserts new text at the caret position while deleting text in range of the offset (which accepts negative offsets). */
  insert(append: string | HTMLElement, offset?: number): void;
  /** Positions the caret where specified */
  move(pos: number | { row: number; column: number }): void;
  /** Returns the current editor state, as usually received in onChange */
  getState(): { content: Content<Item>; position: Position };
}

const serialize = () => {
  throw new Error("Not implemented");
};

export const useEditable = <Item extends Record<string, unknown>>(
  elementRef: { current: HTMLElement | undefined | null },
  onChange: (content: Content<Item>, position: Position) => void,
  opts: Options<Item> = { serialize }
) => {
  const unblock = useState([])[1];
  const state: State<Item> = useState(() => {
    const state: State<Item> = {
      observer: null as unknown as MutationObserver,
      disconnected: false,
      onChange,
      queue: [],
      history: [],
      historyAt: -1,
      position: null,
    };

    if (typeof MutationObserver !== "undefined") {
      state.observer = new MutationObserver((batch) => {
        state.queue.push(...batch);
      });
    }

    return state;
  })[0];

  const edit = useMemo<Edit<Item>>(
    () => ({
      update(content: string) {
        const { current: element } = elementRef;
        if (element) {
          const position = getPosition(element);
          const prevContent = opts.serialize(element).toString();
          position.position += content.toString().length - prevContent.length;
          state.position = position;
          state.onChange(opts.serialize(element), position);
        }
      },
      insert(append: string | HTMLElement, deleteOffset?: number) {
        const { current: element } = elementRef;
        if (element) {
          //const range = getCurrentRange();
          //range.deleteContents();
          //range.insertNode(document.createTextNode(append));
          let range = getCurrentRange();
          range.deleteContents();
          range.collapse();
          const position = getPosition(element);
          const offset = deleteOffset || 0;
          const start = position.position + (offset < 0 ? offset : 0);
          const end = position.position + (offset > 0 ? offset : 0);
          range = makeRange(element, start, end);
          range.deleteContents();
          if (typeof append === "string")
            range.insertNode(document.createTextNode(append));
          if (typeof append === "object") range.insertNode(append);
          setCurrentRange(
            makeRange(
              element,
              start +
                (typeof append === "string"
                  ? append.length
                  : append.textContent!.length)
            )
          );
        }
      },
      move(pos: number | { row: number; column: number }) {
        const { current: element } = elementRef;
        if (element) {
          element.focus();
          let position = 0;
          if (typeof pos === "number") {
            position = pos;
          } else {
            const lines = opts
              .serialize(element)
              .toString()
              .split("\n")
              .slice(0, pos.row);
            if (pos.row) position += lines.join("\n").length + 1;
            position += pos.column;
          }

          setCurrentRange(makeRange(element, position));
        }
      },
      getState() {
        const { current: element } = elementRef;
        const content = opts.serialize(element!);
        const position = getPosition(element!);
        return { content, position };
      },
    }),
    []
  );

  // Only for SSR / server-side logic
  if (typeof navigator !== "object") return edit;

  useLayoutEffect(() => {
    state.onChange = onChange;

    if (!elementRef.current || opts!.disabled) return;

    state.disconnected = false;
    state.observer.observe(elementRef.current, observerSettings);
    if (state.position) {
      const { position, extent } = state.position;
      setCurrentRange(
        makeRange(elementRef.current, position, position + extent)
      );
    }

    return () => {
      state.observer.disconnect();
    };
  });

  useLayoutEffect(() => {
    if (!elementRef.current || opts!.disabled) {
      state.history.length = 0;
      state.historyAt = -1;
      return;
    }

    const element = elementRef.current!;
    if (state.position) {
      element.focus();
      const { position, extent } = state.position;
      setCurrentRange(makeRange(element, position, position + extent));
    }

    const prevWhiteSpace = element.style.whiteSpace;
    const prevContentEditable = element.contentEditable;
    let hasPlaintextSupport = true;
    try {
      // Firefox and IE11 do not support plaintext-only mode
      element.contentEditable = "plaintext-only";
    } catch (_error) {
      element.contentEditable = "true";
      hasPlaintextSupport = false;
    }

    if (prevWhiteSpace !== "pre") element.style.whiteSpace = "pre-wrap";

    if (opts!.indentation) {
      element.style.tabSize = (
        element.style as ElementCSSInlineStyle["style"] & { MozTabSize: string }
      ).MozTabSize = "" + opts!.indentation;
    }

    const indentPattern = `${" ".repeat(opts!.indentation || 0)}`;
    const indentRe = new RegExp(`^(?:${indentPattern})`);
    const blanklineRe = new RegExp(`^(?:${indentPattern})*(${indentPattern})$`);

    let _trackStateTimestamp: number;
    const trackState = (ignoreTimestamp?: boolean) => {
      if (!elementRef.current || !state.position) return;
      const contentData = opts.serialize(element);
      const content = contentData.toString();
      const position = getPosition(element);
      const timestamp = new Date().valueOf();

      // Prevent recording new state in list if last one has been new enough
      const lastEntry = state.history[state.historyAt];
      if (
        (!ignoreTimestamp && timestamp - _trackStateTimestamp < 500) ||
        (lastEntry && lastEntry[1].toString() === content)
      ) {
        _trackStateTimestamp = timestamp;
        return;
      }

      const at = ++state.historyAt;
      state.history[at] = [position, contentData];
      state.history.splice(at + 1);
      if (at > 500) {
        state.historyAt--;
        state.history.shift();
      }
    };

    const disconnect = () => {
      state.observer.disconnect();
      state.disconnected = true;
    };

    const flushChanges = () => {
      state.queue.push(...state.observer.takeRecords());
      const position = getPosition(element);
      if (state.queue.length) {
        disconnect();
        const content = opts.serialize(element);
        state.position = position;
        let mutation: MutationRecord | void;
        let i = 0;
        while ((mutation = state.queue.pop())) {
          if (mutation.oldValue !== null)
            mutation.target.textContent = mutation.oldValue;
          for (i = mutation.removedNodes.length - 1; i >= 0; i--)
            mutation.target.insertBefore(
              mutation.removedNodes[i],
              mutation.nextSibling
            );
          for (i = mutation.addedNodes.length - 1; i >= 0; i--)
            if (mutation.addedNodes[i].parentNode)
              mutation.target.removeChild(mutation.addedNodes[i]);
        }

        state.onChange(content, position);
      }
    };

    const onKeyDown = (event: HTMLElementEventMap["keydown"]) => {
      if (event.defaultPrevented || event.target !== element) {
        return;
      } else if (state.disconnected) {
        // React Quirk: It's expected that we may lose events while disconnected, which is why
        // we'd like to block some inputs if they're unusually fast. However, this always
        // coincides with React not executing the update immediately and then getting stuck,
        // which can be prevented by issuing a dummy state change.
        event.preventDefault();
        return unblock([]);
      }

      if (isUndoRedoKey(event)) {
        event.preventDefault();

        let history: History<Item>;
        if (!event.shiftKey) {
          const at = --state.historyAt;
          history = state.history[at];
          if (!history) state.historyAt = 0;
        } else {
          const at = ++state.historyAt;
          history = state.history[at];
          if (!history) state.historyAt = state.history.length - 1;
        }

        if (history) {
          disconnect();
          state.position = history[0];
          state.onChange(history[1], history[0]);
        }
        return;
      } else {
        trackState();
      }

      if (event.key === "Enter") {
        event.preventDefault();
        // Firefox Quirk: Since plaintext-only is unsupported we must
        // ensure that only newline characters are inserted
        const position = getPosition(element);
        // We also get the current line and preserve indentation for the next
        // line that's created
        const match = /\S/g.exec(position.content);
        const index = match ? match.index : position.content.length;
        const text = "\n" + position.content.slice(0, index);
        edit.insert(text);
      } else if (
        (!hasPlaintextSupport || opts!.indentation) &&
        event.key === "Backspace"
      ) {
        // Firefox Quirk: Since plaintext-only is unsupported we must
        // ensure that only a single character is deleted
        event.preventDefault();
        const range = getCurrentRange();
        if (!range.collapsed) {
          edit.insert("", 0);
        } else {
          const position = getPosition(element);
          const match = blanklineRe.exec(position.content);
          edit.insert("", match ? -match[1].length : -1);
        }
      } else if (opts!.indentation && event.key === "Tab") {
        event.preventDefault();
        const position = getPosition(element);
        const start = position.position - position.content.length;
        const content = opts.serialize(element).toString();
        const newContent = event.shiftKey
          ? content.slice(0, start) +
            position.content.replace(indentRe, "") +
            content.slice(start + position.content.length)
          : content.slice(0, start) +
            (opts!.indentation ? " ".repeat(opts!.indentation) : "\t") +
            content.slice(start);
        edit.update(newContent);
      }

      // Flush changes as a key is held so the app can catch up
      if (event.repeat) flushChanges();
    };

    const onKeyUp = (event: HTMLElementEventMap["keyup"]) => {
      if (event.defaultPrevented || event.isComposing) return;
      if (!isUndoRedoKey(event)) trackState();
      flushChanges();
      // Chrome Quirk: The contenteditable may lose focus after the first edit or so
      element.focus();
    };

    const onSelect = (event: Event) => {
      // Chrome Quirk: The contenteditable may lose its selection immediately on first focus
      state.position =
        window.getSelection()!.rangeCount && event.target === element
          ? getPosition(element)
          : null;
    };

    const onPaste = (event: HTMLElementEventMap["paste"]) => {
      //event.preventDefault();
      //trackState(true);
      edit.insert(event.clipboardData!.getData("text/plain"));
      //trackState(true);
      //flushChanges();
    };

    //document.addEventListener("selectstart", onSelect);
    //window.addEventListener("keydown", onKeyDown);
    element.addEventListener("paste", onPaste);
    //element.addEventListener("keyup", onKeyUp);

    return () => {
      document.removeEventListener("selectstart", onSelect);
      window.removeEventListener("keydown", onKeyDown);
      element.removeEventListener("paste", onPaste);
      element.removeEventListener("keyup", onKeyUp);
      element.style.whiteSpace = prevWhiteSpace;
      element.contentEditable = prevContentEditable;
    };
  }, [elementRef.current!, opts!.disabled, opts!.indentation]);

  return edit;
};
