import { cssVars } from "@webstudio-is/css-vars";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  Text,
  styled,
  Box,
  theme,
  Flex,
} from "@webstudio-is/design-system";
import { ChevronDownIcon } from "@webstudio-is/icons";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useContentEditable } from "~/shared/dom-hooks";

const menuTriggerVisibilityVar = cssVars.define("menu-trigger-visibility");
const menuTriggerVisibilityOverrideVar = cssVars.define(
  "menu-trigger-visibility-override"
);
const menuTriggerGradientVar = cssVars.define("menu-trigger-gradient");

export const menuCssVars = ({
  show,
  override = false,
}: {
  show: boolean;
  override?: boolean;
}) => {
  const property = override
    ? menuTriggerVisibilityOverrideVar
    : menuTriggerVisibilityVar;

  return {
    [property]: show ? "visible" : "hidden",
  };
};

const MenuTrigger = styled("button", {
  display: "inline-flex",
  border: "none",
  boxSizing: "border-box",
  minWidth: 0,
  alignItems: "center",
  position: "absolute",
  right: 0,
  top: 0,
  height: "100%",
  padding: 0,
  borderTopRightRadius: theme.borderRadius[4],
  borderBottomRightRadius: theme.borderRadius[4],
  color: theme.colors.foregroundContrastMain,
  visibility: cssVars.use(
    menuTriggerVisibilityOverrideVar,
    cssVars.use(menuTriggerVisibilityVar)
  ),
  background: theme.colors.backgroundButtonHover,
  "&:hover, &[data-state=open]": {
    ...menuCssVars({ show: true }),
  },
});

const MenuTriggerGradient = styled(Box, {
  position: "absolute",
  top: 0,
  right: 0,
  width: theme.spacing[11],
  height: "100%",
  visibility: cssVars.use(
    menuTriggerVisibilityOverrideVar,
    cssVars.use(menuTriggerVisibilityVar)
  ),
  background: cssVars.use(menuTriggerGradientVar),
  borderTopRightRadius: theme.borderRadius[4],
  borderBottomRightRadius: theme.borderRadius[4],
  pointerEvents: "none",
});

type MenuProps = {
  children: ReactNode;
};

const Menu = (props: MenuProps) => {
  return (
    <DropdownMenu modal>
      <DropdownMenuTrigger asChild>
        <MenuTrigger aria-label="Menu Button">
          <MenuTriggerGradient />
          <ChevronDownIcon style={{ position: "relative" }} />
        </MenuTrigger>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          {props.children}
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
};

export type ItemSource = "token" | "tag" | "local";

type EditableTextProps = {
  label: string;
  isEditable: boolean;
  isEditing: boolean;
  onChangeEditing: (isEditing: boolean) => void;
  onChangeValue: (value: string) => void;
};

const EditableText = ({
  label,
  isEditable,
  isEditing,
  onChangeEditing,
  onChangeValue,
}: EditableTextProps) => {
  const { ref, handlers } = useContentEditable({
    isEditable,
    isEditing,
    onChangeEditing,
    onChangeValue,
  });

  return (
    <Text
      truncate
      ref={ref}
      css={{
        outline: "none",
        textOverflow: isEditing ? "clip" : "ellipsis",
        userSelect: isEditing ? "auto" : "none",
        cursor: isEditing ? "auto" : "default",
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

const StyleSourceContainer = styled(Box, {
  display: "inline-flex",
  borderRadius: theme.borderRadius[3],
  minWidth: theme.spacing[13],
  maxWidth: "100%",
  position: "relative",
  color: theme.colors.foregroundContrastMain,
  ...menuCssVars({ show: false }),
  "&:hover": menuCssVars({ show: true }),
  variants: {
    source: {
      local: {
        backgroundColor: theme.colors.backgroundStyleSourceToken,
        [menuTriggerGradientVar]:
          theme.colors.backgroundStyleSourceGradientToken,
      },
      token: {
        backgroundColor: theme.colors.backgroundStyleSourceToken,
        [menuTriggerGradientVar]:
          theme.colors.backgroundStyleSourceGradientToken,
      },
      tag: {
        backgroundColor: theme.colors.backgroundStyleSourceTag,
        [menuTriggerGradientVar]: theme.colors.backgroundStyleSourceGradientTag,
      },
    },
    selected: {
      true: {},
      false: {
        "&:not(:hover)": {
          backgroundColor: theme.colors.backgroundStyleSourceNeutral,
          [menuTriggerGradientVar]:
            theme.colors.backgroundStyleSourceGradientUnselected,
        },
      },
    },
    disabled: {
      true: {
        "&:not(:hover)": {
          backgroundColor: theme.colors.backgroundStyleSourceDisabled,
        },
      },
      false: {},
    },
  },
});

const StyleSourceButton = styled("button", {
  all: "unset",
  flexGrow: 1,
  display: "block",
  boxSizing: "border-box",
  maxWidth: "100%",
  padding: theme.spacing[3],
  variants: {
    isEditing: {
      true: {
        color: theme.colors.foregroundMain,
        backgroundColor: theme.colors.backgroundControls,
      },
      false: {},
    },
  },
});

const StyleSourceState = styled(Text, {
  padding: theme.spacing[4],
  backgroundColor: theme.colors.backgroundStyleSourceToken,
  borderTopRightRadius: theme.borderRadius[3],
  borderBottomRightRadius: theme.borderRadius[3],
  cursor: "default",
});

type StyleSourceProps = {
  id: string;
  label: string;
  menuItems: ReactNode;
  selected: boolean;
  state: undefined | string;
  stateLabel: undefined | string;
  disabled: boolean;
  isEditing: boolean;
  isDragging: boolean;
  source: ItemSource;
  onSelect: () => void;
  onChangeValue: (value: string) => void;
  onChangeEditing: (isEditing: boolean) => void;
};

export const StyleSource = ({
  id,
  label,
  menuItems,
  selected,
  state,
  stateLabel,
  disabled,
  isEditing,
  isDragging,
  source,
  onChangeValue,
  onChangeEditing,
  onSelect,
}: StyleSourceProps) => {
  const ref = useForceRecalcStyle<HTMLDivElement>("max-width", isEditing);
  const showMenu = isEditing === false && isDragging === false;

  return (
    <StyleSourceContainer
      data-id={id}
      source={source}
      selected={selected && state === undefined}
      disabled={disabled}
      aria-current={selected && state === undefined}
      role="button"
      ref={ref}
    >
      <Flex css={{ flexGrow: 1, padding: theme.spacing[2] }}>
        <StyleSourceButton
          disabled={disabled || isEditing}
          isEditing={isEditing}
          onClick={onSelect}
        >
          <EditableText
            isEditable={source !== "local"}
            isEditing={isEditing}
            onChangeEditing={onChangeEditing}
            onChangeValue={onChangeValue}
            label={label}
          />
        </StyleSourceButton>
      </Flex>
      {stateLabel !== undefined && (
        <StyleSourceState>{stateLabel}</StyleSourceState>
      )}
      {showMenu && <Menu>{menuItems}</Menu>}
    </StyleSourceContainer>
  );
};
