import {
  useRef,
  useEffect,
  useState,
  type KeyboardEventHandler,
  type KeyboardEvent,
  type FocusEvent,
} from "react";

export const useEditable = ({
  isEditable,
  onChangeValue,
}: {
  isEditable: boolean;
  onChangeValue: (value: string) => void;
}) => {
  const [isEditing, setEditMode] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const lastValueRef = useRef<string>("");
  const getValue = () => elementRef.current?.textContent ?? "";

  useEffect(() => {
    const element = elementRef.current;
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
  }, [isEditing]);

  const handleFinishEditing = (
    event: KeyboardEvent<Element> | FocusEvent<Element>
  ) => {
    event.preventDefault();
    if (isEditing) {
      setEditMode(false);
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
    if (isEditable && isEditing === false) {
      setEditMode(true);
    }
  };

  const handlers = {
    onKeyDown: handleKeyDown,
    onblur: handleFinishEditing,
    onDoubleClick: handleDoubleClick,
  };

  return { ref: elementRef, handlers, isEditing };
};
