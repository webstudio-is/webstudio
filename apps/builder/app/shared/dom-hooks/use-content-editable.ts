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
}: {
  isEditable: boolean;
  isEditing: boolean;
  onChangeEditing: (isEditing: boolean) => void;
  onChangeValue: (value: string) => void;
}) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const lastValueRef = useRef<string>("");
  const getValue = () => elementRef.current?.textContent ?? "";

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
        lastValueRef.current = getValue();
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

  const handleFinishEditing = (
    event: KeyboardEvent<Element> | FocusEvent<Element>
  ) => {
    event.preventDefault();
    if (isEditing) {
      onChangeEditing(false);
    }
    onChangeValue(getValue());
    lastValueRef.current = "";
  };

  const handleKeyDown: KeyboardEventHandler = (event) => {
    if (event.key === "Enter") {
      handleFinishEditing(event);
      return;
    }
    if (event.key === "Escape" && elementRef.current !== null) {
      elementRef.current.textContent = lastValueRef.current;
      handleFinishEditing(event);
    }
  };

  const handleDoubleClick = () => {
    if (isEditable) {
      onChangeEditing(true);
    }
  };

  const handlers = {
    onKeyDown: handleKeyDown,
    onBlur: handleFinishEditing,
    onDoubleClick: handleDoubleClick,
  };

  return { ref: elementRef, handlers };
};
