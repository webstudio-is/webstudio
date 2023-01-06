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
} from "react";
import { sanitize } from "./sanitize";

// Used to schedule function calls to be executed after at a later point in time.
// Since menu is managing focus, we need to execute that callback when the management is done.
const useCallScheduler = () => {
  const ref = useRef<Array<() => void>>([]);
  const call = () => {
    for (const fn of ref.current) {
      fn();
    }
    ref.current = [];
  };
  const add = (fn: () => void) => () => {
    ref.current.push(fn);
  };

  return { call, add };
};

type MenuProps = {
  onEdit: () => void;
  onDuplicateItem: () => void;
  onRemoveItem: () => void;
};

const Menu = (props: MenuProps) => {
  const scheduler = useCallScheduler();
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
        <DropdownMenuContent onCloseAutoFocus={scheduler.call}>
          <DropdownMenuItem onSelect={scheduler.add(props.onEdit)}>
            Edit Name
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={scheduler.add(props.onDuplicateItem)}>
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={scheduler.add(props.onRemoveItem)}>
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
};

type EditableTextProps = {
  label: string;
  onChange: (value: string) => void;
  isEditing: boolean;
  onEditingChange: (isEditing: boolean) => void;
};

const EditableText = ({
  onChange,
  label,
  isEditing,
  onEditingChange,
}: EditableTextProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current === null || isEditing === false) {
      return;
    }
    ref.current.setAttribute("contenteditable", "plaintext-only");
    ref.current.focus();
    getSelection()?.selectAllChildren(ref.current);
  }, [isEditing]);

  const handleKeyDown: KeyboardEventHandler = (event) => {
    if (event.key === "Enter" && ref.current !== null) {
      event.preventDefault();
      ref.current.removeAttribute("contenteditable");
      onEditingChange(false);
      onChange(sanitize(ref.current.textContent ?? ""));
    }
  };

  return (
    <Text
      truncate
      ref={ref}
      onKeyDown={handleKeyDown}
      css={{ outline: "none", textOverflow: isEditing ? "clip" : "ellipsis" }}
    >
      {label}
    </Text>
  );
};

// Forces layout to recalc max-width when editing is done, because otherwise,
// layout will keep the value from before engaging contenteditable.
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
    const requestId = requestAnimationFrame(() => {
      element.style.removeProperty(property);
    });
    return () => {
      cancelAnimationFrame(requestId);
    };
  }, [calculate, property]);
  return ref;
};

const Item = styled(Button, {
  maxWidth: "100%",
  position: "relative",
  "& button": { display: "none" },
  "&:hover button": { display: "block" },
});

type EditableItemProps = {
  children: Array<JSX.Element | false>;
  isEditing: boolean;
};

const EditableItem = ({ children, isEditing }: EditableItemProps) => {
  const ref = useForceRecalcStyle<HTMLDivElement>(
    "max-width",
    isEditing === false
  );
  return (
    <Item variant="gray" ref={ref} as="div">
      {children}
    </Item>
  );
};

type StyleSourceProps = {
  label: string;
  hasMenu: boolean;
  isEditing: boolean;
  onEditingChange: (isEditing: boolean) => void;
  onDuplicateItem: () => void;
  onRemoveItem: () => void;
  onChange: (value: string) => void;
};

export const StyleSource = ({
  label,
  hasMenu,
  onChange,
  isEditing,
  onEditingChange,
  ...menuProps
}: StyleSourceProps) => {
  return (
    <EditableItem isEditing={isEditing}>
      <EditableText
        isEditing={isEditing}
        onEditingChange={onEditingChange}
        onChange={onChange}
        label={label}
      />
      {hasMenu === true && isEditing === false && (
        <Menu
          {...menuProps}
          onEdit={() => {
            onEditingChange(true);
          }}
        />
      )}
    </EditableItem>
  );
};
