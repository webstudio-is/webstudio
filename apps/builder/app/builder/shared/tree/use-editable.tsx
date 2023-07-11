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

  useEffect(() => {
    if (elementRef.current === null) {
      return;
    }

    if (isEditing) {
      elementRef.current.setAttribute("contenteditable", "plaintext-only");
      requestAnimationFrame(() => {
        if (elementRef.current === null) {
          return;
        }

        elementRef.current.focus();
        getSelection()?.selectAllChildren(elementRef.current);
        lastValueRef.current = getValue();
      });
      return;
    }

    elementRef.current.removeAttribute("contenteditable");
  }, [isEditing]);

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
