import {
  useRef,
  useEffect,
  type KeyboardEventHandler,
  type KeyboardEvent,
  type FocusEvent,
} from "react";

export const useEditable = ({
  isEditing,
  onChangeValue,
}: {
  isEditing: boolean;
  onChangeValue: (value: string) => void;
}) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const lastValueRef = useRef<string>("");
  const getValue = () => elementRef.current?.textContent ?? "";
  const element = elementRef.current;

  useEffect(() => {
    if (element === null) {
      return;
    }

    if (isEditing) {
      element.setAttribute("contenteditable", "plaintext-only");
      requestAnimationFrame(() => {
        element.focus();
        getSelection()?.selectAllChildren(element);
        lastValueRef.current = getValue();
      });
      return;
    }

    element.removeAttribute("contenteditable");
  }, [isEditing, element]);

  const handleFinishEditing = (
    event: KeyboardEvent<Element> | FocusEvent<Element>
  ) => {
    event.stopPropagation();
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

  const handlers = {
    onKeyDown: handleKeyDown,
    onBlur: handleFinishEditing,
  };

  return { ref: elementRef, handlers, isEditing };
};
