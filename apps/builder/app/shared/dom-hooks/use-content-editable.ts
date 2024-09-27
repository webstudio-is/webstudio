import {
  useRef,
  type FocusEvent,
  type KeyboardEvent,
  type KeyboardEventHandler,
  useEffect,
} from "react";

export const useContentEditable = ({
  isEditable,
  isEditing,
  onChangeEditing,
  onChangeValue,
  value,
}: {
  isEditable: boolean;
  isEditing: boolean;
  onChangeEditing: (isEditing: boolean) => void;
  onChangeValue: (value: string) => void;
  value: string;
}) => {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const setTextContent = () => {
    if (elementRef.current && isEditing === false) {
      elementRef.current.textContent = value;
    }
  };
  const ref = (element: HTMLDivElement | null) => {
    elementRef.current = element;
    setTextContent();
  };
  const getValue = () => elementRef.current?.textContent ?? "";

  useEffect(setTextContent, [value, isEditing]);

  useEffect(() => {
    const element = elementRef.current;
    if (element === null) {
      return;
    }

    // Nothing changed, do nothing
    if (element.hasAttribute("contenteditable") === isEditing) {
      return;
    }

    if (isEditing) {
      element.setAttribute("contenteditable", "plaintext-only");
      // the next frame is necessary when newly created element
      // need to get focus, for example after duplicate operation
      requestAnimationFrame(() => {
        element.focus();
        getSelection()?.selectAllChildren(element);
      });
      return;
    }

    element.removeAttribute("contenteditable");
    // This is needed to force layout to recalc max-width when editing is done,
    // because otherwise, layout will keep the value from before engaging contenteditable.
    const { parentElement } = element;
    if (parentElement) {
      parentElement.removeChild(element);
      parentElement.appendChild(element);
    }
  }, [isEditing]);

  const handleEnd = (event: KeyboardEvent<Element> | FocusEvent<Element>) => {
    event.preventDefault();
    if (isEditing) {
      onChangeEditing(false);
    }
  };

  const handleComplete = (
    event: KeyboardEvent<Element> | FocusEvent<Element>
  ) => {
    event.preventDefault();
    if (isEditing === false) {
      return;
    }
    const nextValue = getValue();
    handleEnd(event);
    onChangeValue(nextValue);
  };

  const handleKeyDown: KeyboardEventHandler = (event) => {
    if (isEditing === false) {
      return;
    }
    // prevent keyboard navigation on parent elements
    event.stopPropagation();
    if (event.key === "Enter") {
      handleComplete(event);
    }
    if (event.key === "Escape" && elementRef.current !== null) {
      elementRef.current.textContent = value;
      handleEnd(event);
    }
  };

  const handleDoubleClick = () => {
    if (isEditable) {
      onChangeEditing(true);
    }
  };

  const handlers = {
    onKeyDown: handleKeyDown,
    onBlur: handleComplete,
    onDoubleClick: handleDoubleClick,
  };

  return { ref, handlers };
};
