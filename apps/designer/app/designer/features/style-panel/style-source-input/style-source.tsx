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
import {
  KeyboardEventHandler,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { sanitize } from "./sanitize";

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
        <IconButton
          aria-label="Menu Button"
          css={{ position: "absolute", right: 0 }}
        >
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
  const ref = useRef<HTMLDivElement>(null);

  const handleEdit = () => {
    if (ref.current === null) {
      return;
    }
    onEdit();
    setIsEditing(true);
    ref.current.focus();
    getSelection()?.selectAllChildren(ref.current);
  };

  const handleKeyDown: KeyboardEventHandler = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      setIsEditing(false);
      onChange(sanitize(ref.current?.textContent ?? ""));
    }
  };

  const text = (
    <Text
      truncate
      contentEditable={isEditing ? "plaintext-only" : false}
      ref={ref}
      onKeyDown={handleKeyDown}
      css={{
        outline: "none",
        textOverflow: isEditing ? "clip" : "ellipsis",
      }}
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

// Forces layout to recalc max-width when editing is done, because otherwise,
// layout will keep the value from before engaging content-editable.
const useForceRecalcStyle = <Element extends HTMLElement>(
  property: string,
  calculate: boolean
) => {
  const ref = useRef<Element>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (calculate === false || element === null) {
      return;
    }
    element.style.setProperty(property, "initial");
    requestAnimationFrame(() => {
      element.style.removeProperty(property);
    });
  }, [calculate]);
  return ref;
};

const StyledButton = styled(Button, {
  maxWidth: "100%",
  position: "relative",
  "& button": { display: "none" },
  "&:hover button": { display: "block" },
});

type EditableButtonProps = {
  children: Array<JSX.Element | false>;
  isEditing: boolean;
};

const EditableButton = ({ children, isEditing }: EditableButtonProps) => {
  const ref = useForceRecalcStyle<HTMLButtonElement>(
    "max-width",
    isEditing === false
  );
  return (
    <StyledButton variant="gray" ref={ref}>
      {children}
    </StyledButton>
  );
};

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
    <EditableButton isEditing={isEditing}>
      {text}
      {hasMenu === true && isEditing === false && (
        <Menu {...menuProps} onEdit={handleEdit} />
      )}
    </EditableButton>
  );
};
