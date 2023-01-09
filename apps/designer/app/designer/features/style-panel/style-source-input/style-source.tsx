import { cssVars } from "@webstudio-is/css-vars";
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
  useEffect,
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type KeyboardEventHandler,
  type FocusEvent,
} from "react";

// Used to schedule function calls to be executed after at a later point in time.
// Since menu is managing focus, we need to execute that callback when the management is done.
const useCallScheduler = () => {
  const ref = useRef<(() => void) | undefined>();
  const call = () => {
    ref.current?.();
    ref.current = undefined;
  };
  const set = (fn: () => void) => () => {
    ref.current = fn;
  };
  return { call, set };
};

const menuTriggerVisibilityVar = cssVars.define("menu-trigger-visibility");

const menuCssVars = ({ show }: { show: boolean }) => ({
  [menuTriggerVisibilityVar]: show ? "visible" : "hidden",
});

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
        {/* Migrate to a Button component once implemented https://github.com/webstudio-is/webstudio-designer/issues/450 */}
        <IconButton
          aria-label="Menu Button"
          css={{
            position: "absolute",
            right: 0,
            visibility: cssVars.use(menuTriggerVisibilityVar),
          }}
        >
          <ChevronDownIcon />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent onCloseAutoFocus={scheduler.call}>
          <DropdownMenuItem onSelect={scheduler.set(props.onEdit)}>
            Edit Name
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={scheduler.set(props.onDuplicateItem)}>
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={scheduler.set(props.onRemoveItem)}>
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
    if (ref.current === null) {
      return;
    }

    if (isEditing === true) {
      ref.current.setAttribute("contenteditable", "plaintext-only");
      ref.current.focus();
      getSelection()?.selectAllChildren(ref.current);
      return;
    }

    ref.current?.removeAttribute("contenteditable");
  }, [isEditing]);

  const handleFinishEditing = (
    event: KeyboardEvent<Element> | FocusEvent<Element>
  ) => {
    event.preventDefault();
    onEditingChange(false);
    onChange(ref.current?.textContent ?? "");
  };

  const handleKeyDown: KeyboardEventHandler = (event) => {
    if (event.key === "Enter") {
      handleFinishEditing(event);
    }
  };

  const handleClick = () => {
    onEditingChange(true);
  };

  return (
    <Text
      truncate
      ref={ref}
      onKeyDown={handleKeyDown}
      onBlur={handleFinishEditing}
      onClick={handleClick}
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
    const restore = () => {
      element.style.removeProperty(property);
    };
    const requestId = requestAnimationFrame(restore);
    return () => {
      cancelAnimationFrame(requestId);
      restore();
    };
  }, [calculate, property]);
  return ref;
};

const Item = styled(Button, {
  maxWidth: "100%",
  position: "relative",
  ...menuCssVars({ show: false }),
  "&:hover": menuCssVars({ show: true }),
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
