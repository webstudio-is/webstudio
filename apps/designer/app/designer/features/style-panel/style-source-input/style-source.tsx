import { cssVars } from "@webstudio-is/css-vars";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  IconButton,
  DeprecatedButton,
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
  state: ItemState;
  onEdit: () => void;
  onDisable: () => void;
  onEnable: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
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
          {props.state === "disabled" && (
            <DropdownMenuItem onSelect={scheduler.set(props.onEnable)}>
              Enable
            </DropdownMenuItem>
          )}
          {props.state !== "disabled" && (
            <DropdownMenuItem onSelect={scheduler.set(props.onDisable)}>
              Disable
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={scheduler.set(props.onDuplicate)}>
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={scheduler.set(props.onRemove)}>
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
};

export type ItemState = "initial" | "editing" | "disabled" | "dragging";

const useEditableText = ({
  state,
  onStateChange,
  onChange,
}: {
  state: ItemState;
  onStateChange: (state: ItemState) => void;
  onChange: (value: string) => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current === null) {
      return;
    }

    if (state === "editing") {
      ref.current.setAttribute("contenteditable", "plaintext-only");
      ref.current.focus();
      getSelection()?.selectAllChildren(ref.current);
      return;
    }

    ref.current?.removeAttribute("contenteditable");
  }, [state]);

  const handleFinishEditing = (
    event: KeyboardEvent<Element> | FocusEvent<Element>
  ) => {
    event.preventDefault();
    onStateChange("initial");
    onChange(ref.current?.textContent ?? "");
  };

  const handleKeyDown: KeyboardEventHandler = (event) => {
    if (event.key === "Enter") {
      handleFinishEditing(event);
    }
  };

  return { handleKeyDown, handleFinishEditing, ref };
};

type EditableTextProps = {
  label: string;
  onChange: (value: string) => void;
  state: ItemState;
  onStateChange: (state: ItemState) => void;
  onChangeCurrent: () => void;
};

const EditableText = ({
  onChange,
  label,
  state,
  onStateChange,
  onChangeCurrent,
}: EditableTextProps) => {
  const { ref, handleKeyDown, handleFinishEditing } = useEditableText({
    state,
    onStateChange,
    onChange,
  });

  return (
    <Text
      truncate
      ref={ref}
      onKeyDown={handleKeyDown}
      onBlur={handleFinishEditing}
      onClick={onChangeCurrent}
      css={{
        outline: "none",
        textOverflow: state === "editing" ? "clip" : "ellipsis",
      }}
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

const Item = styled(DeprecatedButton, {
  maxWidth: "100%",
  position: "relative",
  ...menuCssVars({ show: false }),
  "&:hover": menuCssVars({ show: true }),
  variants: {
    state: {
      disabled: {
        // @todo styling
        opacity: 0.5,
      },
      editing: {},
      initial: {},
      dragging: {
        // @todo styling
        opacity: 0.5,
      },
    },
  },
});

type EditableItemProps = {
  id: string;
  children: Array<JSX.Element | false>;
  state: ItemState;
  isCurrent: boolean;
};

const EditableItem = ({
  children,
  state,
  id,
  isCurrent,
}: EditableItemProps) => {
  const ref = useForceRecalcStyle<HTMLDivElement>(
    "max-width",
    state === "editing"
  );
  return (
    <Item
      variant={isCurrent ? "blue" : "gray"}
      state={state}
      ref={ref}
      as="div"
      data-id={id}
    >
      {children}
    </Item>
  );
};

type StyleSourceProps = {
  id: string;
  label: string;
  hasMenu: boolean;
  state: ItemState;
  isCurrent: boolean;
  onStateChange: (state: ItemState) => void;
  onChangeCurrent: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onChange: (value: string) => void;
};

export const StyleSource = ({
  id,
  label,
  hasMenu,
  state,
  isCurrent,
  onChange,
  onStateChange,
  onChangeCurrent,
  onDuplicate,
  onRemove,
}: StyleSourceProps) => {
  return (
    <EditableItem state={state} id={id} isCurrent={isCurrent}>
      <EditableText
        state={state}
        onStateChange={onStateChange}
        onChangeCurrent={onChangeCurrent}
        onChange={onChange}
        label={label}
      />
      {hasMenu === true && state !== "editing" && (
        <Menu
          state={state}
          onDuplicate={onDuplicate}
          onRemove={onRemove}
          onEnable={() => {
            onStateChange("initial");
          }}
          onDisable={() => {
            onStateChange("disabled");
          }}
          onEdit={() => {
            onStateChange("editing");
          }}
        />
      )}
    </EditableItem>
  );
};
