import { cssVars } from "@webstudio-is/css-vars";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  Text,
  styled,
  baseButtonStyle,
} from "@webstudio-is/design-system";
import { ChevronDownIcon } from "@webstudio-is/icons";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type KeyboardEventHandler,
  type FocusEvent,
  ComponentProps,
  forwardRef,
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

const MenuTrigger = styled("button", baseButtonStyle, {
  position: "absolute",
  right: 0,
  top: 0,
  height: "100%",
  padding: 0,
  borderTopLeftRadius: 0,
  borderBottomLeftRadius: 0,
  visibility: cssVars.use(menuTriggerVisibilityVar),
  variants: {
    source: {
      local: {
        background: "$colors$backgroundStyleSourceToken",
        "&:hover": {
          background: "$colors$backgroundButtonHover",
        },
      },
      token: {
        background: "$colors$backgroundStyleSourceToken",
        "&:hover": {
          background: "$colors$backgroundButtonHover",
        },
      },
      tag: {
        background: "$colors$backgroundStyleSourceTag",
        "&:hover": {
          background: "$colors$backgroundButtonHover",
        },
      },
      state: {
        background: "$colors$backgroundStyleSourceState",
        "&:hover": {
          background: "$colors$backgroundButtonHover",
        },
      },
    },
  },
});

const MenuTriggerGradient = styled("div", {
  position: "absolute",
  top: 0,
  right: 0,
  width: "$spacing$11",
  height: "100%",
  visibility: cssVars.use(menuTriggerVisibilityVar),
  borderTopRightRadius: "$borderRadius$4",
  borderBottomRightRadius: "$borderRadius$4",
  variants: {
    source: {
      local: {
        background: "$colors$backgroundStyleSourceGradientToken",
      },
      token: {
        background: "$colors$backgroundStyleSourceGradientToken",
      },
      tag: {
        background: "$colors$backgroundStyleSourceGradientTag",
      },
      state: {
        background: "$colors$backgroundStyleSourceGradientState",
      },
    },
  },
});

type MenuProps = {
  source: ItemSource;
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
      <MenuTriggerGradient source={props.source} />
      <DropdownMenuTrigger asChild>
        <MenuTrigger aria-label="Menu Button" source={props.source}>
          <ChevronDownIcon />
        </MenuTrigger>
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

export type ItemState =
  | "unselected"
  | "selected"
  | "editing"
  | "disabled"
  | "dragging";

export type ItemSource = "token" | "tag" | "state" | "local";

const useEditableText = ({
  state,
  isEditable,
  onStateChange,
  onChange,
  onClick,
}: {
  state: ItemState;
  isEditable: boolean;
  onStateChange: (state: ItemState) => void;
  onChange: (value: string) => void;
  onClick: () => void;
}) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const lastValueRef = useRef<string>("");
  const lastStateRef = useRef<ItemState>(state);
  const getValue = () => elementRef.current?.textContent ?? "";

  useEffect(() => {
    if (elementRef.current === null) {
      return;
    }

    if (state === "editing") {
      elementRef.current.setAttribute("contenteditable", "plaintext-only");
      elementRef.current.focus();
      getSelection()?.selectAllChildren(elementRef.current);
      lastValueRef.current = getValue();
      return;
    }

    elementRef.current?.removeAttribute("contenteditable");
    lastStateRef.current = state;
  }, [state]);

  const handleFinishEditing = (
    event: KeyboardEvent<Element> | FocusEvent<Element>
  ) => {
    if (state !== "editing" || elementRef.current === null) {
      return;
    }
    event.preventDefault();
    onStateChange(lastStateRef.current);
    // Reverting to the previous value when user hits Escape
    if ("key" in event && event.key === "Escape") {
      elementRef.current.textContent = lastValueRef.current;
      return;
    }
    onChange(getValue());
    lastValueRef.current = "";
  };

  const handleKeyDown: KeyboardEventHandler = (event) => {
    if (event.key === "Enter" || event.key === "Escape") {
      handleFinishEditing(event);
    }
  };

  const handleDoubleClick = () => {
    if (isEditable) {
      onStateChange("editing");
    }
  };

  const handlers = {
    onKeyDown: handleKeyDown,
    onBlur: handleFinishEditing,
    onClick,
    onDoubleClick: handleDoubleClick,
  };

  return { ref: elementRef, handlers };
};

type EditableTextProps = {
  label: string;
  isEditable: boolean;
  onChange: (value: string) => void;
  state: ItemState;
  onStateChange: (state: ItemState) => void;
  onClick: () => void;
};

const EditableText = ({
  onChange,
  label,
  state,
  isEditable,
  onStateChange,
  onClick,
}: EditableTextProps) => {
  const { ref, handlers } = useEditableText({
    state,
    isEditable,
    onStateChange,
    onChange,
    onClick,
  });

  return (
    <Text
      truncate
      ref={ref}
      css={{
        outline: "none",
        textOverflow: state === "editing" ? "clip" : "ellipsis",
      }}
      {...handlers}
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

const StyledItem = styled("div", {
  display: "inline-flex",
  borderRadius: "$borderRadius$3",
  padding: "$spacing$4",
  maxWidth: "100%",
  minWidth: 0,
  position: "relative",
  color: "$colors$foregroundContrastMain",
  ...menuCssVars({ show: false }),
  "&:hover": menuCssVars({ show: true }),
  variants: {
    source: {
      local: {
        backgroundColor: "$colors$backgroundStyleSourceToken",
      },
      token: {
        backgroundColor: "$colors$backgroundStyleSourceToken",
      },
      tag: {
        backgroundColor: "$colors$backgroundStyleSourceTag",
      },
      state: {
        backgroundColor: "$colors$backgroundStyleSourceState",
      },
    },
    state: {
      selected: {},
      unselected: {
        backgroundColor: "$colors$backgroundStyleSourceNeutral",
      },
      disabled: {
        // @todo styling
        opacity: 0.5,
      },
      editing: {},
      dragging: {
        backgroundColor: "$colors$backgroundStyleSourceDisabled",
      },
    },
  },
  defaultVariants: {
    state: "unselected",
  },
});

const Item = forwardRef<HTMLDivElement, ComponentProps<typeof StyledItem>>(
  ({ id, state, ...props }, ref) => {
    return (
      <StyledItem
        data-id={id}
        aria-current={state === "selected"}
        role="button"
        state={state}
        ref={ref}
        {...props}
      />
    );
  }
);
Item.displayName = "Item";

type StyleSourceProps = {
  id: string;
  label: string;
  hasMenu: boolean;
  isEditable: boolean;
  state: ItemState;
  source: ItemSource;
  onStateChange: (state: ItemState) => void;
  onSelect: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onChange: (value: string) => void;
};

export const StyleSource = ({
  id,
  label,
  hasMenu,
  state,
  isEditable,
  source,
  onChange,
  onStateChange,
  onSelect,
  onDuplicate,
  onRemove,
}: StyleSourceProps) => {
  const ref = useForceRecalcStyle<HTMLDivElement>(
    "max-width",
    state === "editing"
  );
  return (
    <Item state={state} source={source} id={id} ref={ref}>
      <EditableText
        state={state}
        isEditable={isEditable}
        onStateChange={onStateChange}
        onClick={onSelect}
        onChange={onChange}
        label={label}
      />
      {hasMenu === true && state !== "editing" && (
        <Menu
          source={source}
          state={state}
          onDuplicate={onDuplicate}
          onRemove={onRemove}
          onEnable={() => {
            onStateChange("unselected");
          }}
          onDisable={() => {
            onStateChange("disabled");
          }}
          onEdit={() => {
            onStateChange("editing");
          }}
        />
      )}
    </Item>
  );
};
