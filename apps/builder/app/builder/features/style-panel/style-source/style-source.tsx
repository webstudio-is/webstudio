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
import { type ReactNode } from "react";
import { useContentEditable } from "~/shared/dom-hooks";

const menuTriggerVisibilityVar = "--ws-style-source-menu-trigger-visibility";
const menuTriggerVisibilityOverrideVar =
  "--ws-style-source-menu-trigger-visibility-override";
const menuTriggerGradientVar = "--ws-style-source-menu-trigger-gradient";
const visibility = `var(${menuTriggerVisibilityOverrideVar}, var(${menuTriggerVisibilityVar}))`;

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
  visibility,
  "&:hover, &[data-state=open]": {
    ...menuCssVars({ show: true }),
    "&::after": {
      content: '""',
      display: "block",
      position: "absolute",
      top: 0,
      right: 0,
      width: "100%",
      height: "100%",
      visibility,
      backgroundColor: theme.colors.backgroundButtonHover,
      borderTopRightRadius: theme.borderRadius[4],
      borderBottomRightRadius: theme.borderRadius[4],
      pointerEvents: "none",
    },
  },
});

const MenuTriggerGradient = styled(Box, {
  position: "absolute",
  top: 0,
  right: 0,
  width: theme.spacing[11],
  height: "100%",
  visibility,
  background: `var(${menuTriggerGradientVar})`,
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
          css={{ maxWidth: theme.spacing[24] }}
        >
          {props.children}
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
};

export type ItemSource = "token" | "componentToken" | "tag" | "local";

type EditableTextProps = {
  label: string;
  isEditing: boolean;
  onChangeEditing: (isEditing: boolean) => void;
  onChangeValue: (value: string) => void;
};

const EditableText = ({
  label,
  isEditing,
  onChangeEditing,
  onChangeValue,
}: EditableTextProps) => {
  const { ref, handlers } = useContentEditable({
    isEditable: true,
    isEditing,
    onChangeEditing,
    onChangeValue,
  });

  return (
    <Text
      truncate
      ref={ref}
      spellCheck={false}
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

const StyleSourceContainer = styled(Box, {
  display: "inline-flex",
  borderRadius: theme.borderRadius[3],
  minWidth: theme.spacing[14],
  maxWidth: "100%",
  position: "relative",
  color: theme.colors.foregroundContrastMain,
  ...menuCssVars({ show: false }),
  "&:hover": menuCssVars({ show: true }),
  variants: {
    source: {
      local: {
        order: 1,
        backgroundColor: theme.colors.backgroundStyleSourceLocal,
        [menuTriggerGradientVar]:
          theme.colors.backgroundStyleSourceGradientLocal,
      },
      token: {
        backgroundColor: theme.colors.backgroundStyleSourceToken,
        [menuTriggerGradientVar]:
          theme.colors.backgroundStyleSourceGradientToken,
      },
      componentToken: {
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
  padding: theme.spacing[3],
  borderTopRightRadius: theme.borderRadius[3],
  borderBottomRightRadius: theme.borderRadius[3],
  cursor: "default",
  variants: {
    source: {
      local: {
        backgroundColor: theme.colors.backgroundStyleSourceLocal,
      },
      token: {
        backgroundColor: theme.colors.backgroundStyleSourceToken,
      },
      componentToken: {
        backgroundColor: theme.colors.backgroundStyleSourceToken,
      },
      tag: {
        backgroundColor: theme.colors.backgroundStyleSourceTag,
      },
    },
  },
});

type StyleSourceProps = {
  id: string;
  children: ReactNode;
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
  menuItems,
  selected,
  state,
  stateLabel,
  disabled,
  isEditing,
  isDragging,
  source,
  children,
  onChangeValue,
  onChangeEditing,
  onSelect,
}: StyleSourceProps) => {
  const showMenu = isEditing === false && isDragging === false;

  return (
    <StyleSourceContainer
      data-id={id}
      source={source}
      selected={selected && state === undefined}
      disabled={disabled}
      aria-current={selected && state === undefined}
      role="button"
    >
      <Flex css={{ flexGrow: 1, py: theme.spacing[2], px: theme.spacing[3] }}>
        <StyleSourceButton
          disabled={disabled || isEditing}
          isEditing={isEditing}
          onClick={onSelect}
          tabIndex={-1}
        >
          {typeof children === "string" ? (
            <EditableText
              isEditing={isEditing}
              onChangeEditing={onChangeEditing}
              onChangeValue={onChangeValue}
              label={children}
            />
          ) : (
            children
          )}
        </StyleSourceButton>
      </Flex>
      {stateLabel !== undefined && (
        <StyleSourceState source={source} css={{ lineHeight: 1 }}>
          {stateLabel}
        </StyleSourceState>
      )}
      {showMenu && <Menu>{menuItems}</Menu>}
    </StyleSourceContainer>
  );
};
