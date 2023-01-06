import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  IconButton,
  Button,
  Text,
  styled,
} from "@webstudio-is/design-system";
import { ChevronDownIcon } from "@webstudio-is/icons";
import { KeyboardEventHandler, useEffect, useRef, useState } from "react";
import { handle } from "~/routes";

type MenuProps = {
  onEdit: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
};

const Menu = (props: MenuProps) => {
  const scheduledCallsRef = useRef<Array<() => void>>([]);
  const callScheduledCalls = () => {
    for (const fn of scheduledCallsRef.current) {
      fn();
    }
    scheduledCallsRef.current = [];
  };
  const scheduleCall = (fn: () => void) => () => {
    scheduledCallsRef.current.push(fn);
  };

  return (
    <DropdownMenu modal>
      <DropdownMenuTrigger asChild>
        <IconButton aria-label="Menu Button">
          <ChevronDownIcon />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent onCloseAutoFocus={callScheduledCalls}>
          <DropdownMenuItem onSelect={scheduleCall(props.onEdit)}>
            Edit Name
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={props.onDuplicate}>
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={props.onRemove}>Remove</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
};

type UseEditableTextProps = {
  label: string;
  onEdit: () => void;
  onChange: (value: string) => void;
};

const useEditableText = ({ onEdit, onChange, label }: UseEditableTextProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  const handleEdit = () => {
    if (textRef.current === null) {
      return;
    }
    onEdit();
    setIsEditing(true);
    textRef.current.focus();
    getSelection()?.selectAllChildren(textRef.current);
  };

  const handleKeyDown: KeyboardEventHandler = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      setIsEditing(false);
      // @todo sanitize
      onChange(textRef.current?.textContent ?? "");
    }
  };

  const text = (
    <Text
      truncate
      contentEditable={isEditing ? "plaintext-only" : false}
      ref={textRef}
      onKeyDown={handleKeyDown}
      css={{ outline: "none" }}
    >
      {label}
    </Text>
  );

  return {
    isEditing,
    handleEdit,
    text,
  };
};

const EditableButton = styled(Button, {
  maxWidth: "100%",
});

type StyleSourceProps = {
  label: string;
  hasMenu: boolean;
  onDuplicate: () => void;
  onRemove: () => void;
  onEdit: () => void;
  onChange: (value: string) => void;
};

export const StyleSource = ({
  label,
  hasMenu,
  onEdit,
  onChange,
  ...menuProps
}: StyleSourceProps) => {
  const { text, isEditing, handleEdit } = useEditableText({
    onEdit,
    onChange,
    label,
  });
  return (
    <EditableButton variant="gray">
      {text}
      {hasMenu === true && isEditing === false && (
        <Menu {...menuProps} onEdit={handleEdit} />
      )}
    </EditableButton>
  );
};
