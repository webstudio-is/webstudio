import {
  Text,
  styled,
  Box,
  theme,
  Flex,
  Tooltip,
} from "@webstudio-is/design-system";
import type { StyleSource } from "@webstudio-is/sdk";
import { type ReactNode } from "react";
import { useContentEditable } from "~/shared/dom-hooks";

const menuTriggerVisibilityVar = "--ws-style-source-menu-trigger-visibility";
const menuTriggerVisibilityOverrideVar =
  "--ws-style-source-menu-trigger-visibility-override";
const menuTriggerGradientVar = "--ws-style-source-menu-trigger-gradient";

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

export type ItemSource = "token" | "tag" | "local";

export type ItemSelector = {
  styleSourceId: string;
  state?: string;
};

type EditableTextProps = {
  value: string;
  isEditing: boolean;
  onChangeEditing: (isEditing: boolean) => void;
  onChangeValue: (value: string) => void;
};

const EditableText = ({
  value,
  isEditing,
  onChangeEditing,
  onChangeValue,
}: EditableTextProps) => {
  const { ref, handlers } = useContentEditable({
    isEditable: true,
    isEditing,
    onChangeEditing,
    onChangeValue,
    value,
  });

  return (
    <Text
      truncate
      ref={ref}
      spellCheck={false}
      userSelect={isEditing ? "text" : "none"}
      css={{
        // prevent collapsing horizontally editable text when empty
        flexGrow: 1,
        outline: "none",
        textOverflow: isEditing ? "clip" : "ellipsis",
        cursor: isEditing ? "auto" : "default",
      }}
      {...handlers}
    >
      {value}
    </Text>
  );
};

const StyleSourceContainer = styled(Box, {
  display: "inline-flex",
  borderRadius: theme.borderRadius[3],
  minWidth: theme.spacing[14],
  maxWidth: "100%",
  height: theme.spacing[10],
  position: "relative",
  overflow: "hidden",
  alignItems: "center",
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
    hasError: {
      true: {
        backgroundColor: theme.colors.backgroundDestructiveMain,
      },
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
      tag: {
        backgroundColor: theme.colors.backgroundStyleSourceTag,
      },
    },
  },
});

const LocalStyleIcon = ({ size = 16, showDot = true }) => {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="none">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z"
      />
      {showDot && (
        <path
          fill="currentColor"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 9.333a1.333 1.333 0 1 0 0-2.666 1.333 1.333 0 0 0 0 2.666Z"
        />
      )}
    </svg>
  );
};

const errors = {
  minlength: "Token must be at least 1 character long",
  duplicate: "Token already exists",
} as const;

export type StyleSourceError = {
  type: keyof typeof errors;
  id: StyleSource["id"];
};

type StyleSourceControlProps = {
  id: StyleSource["id"];
  error?: StyleSourceError;
  label: string;
  menu: ReactNode;
  selected: boolean;
  state: undefined | string;
  stateLabel: undefined | string;
  disabled: boolean;
  isEditing: boolean;
  isDragging: boolean;
  hasStyles: boolean;
  source: ItemSource;
  onSelect: () => void;
  onChangeValue: (value: string) => void;
  onChangeEditing: (isEditing: boolean) => void;
  onOpenMenu?: () => void;
};

export const StyleSourceControl = ({
  id,
  menu,
  selected,
  state,
  stateLabel,
  error,
  disabled,
  isEditing,
  isDragging,
  hasStyles,
  source,
  label,
  onChangeValue,
  onChangeEditing,
  onSelect,
  onOpenMenu,
}: StyleSourceControlProps) => {
  const showMenu = isEditing === false && isDragging === false;

  const handleContextMenu = (event: React.MouseEvent) => {
    if (showMenu && disabled === false && isEditing === false) {
      event.preventDefault();
      onOpenMenu?.();
    }
  };

  return (
    <Tooltip
      content={error ? errors[error.type] : ""}
      open={error !== undefined}
    >
      <StyleSourceContainer
        data-id={id}
        source={source}
        selected={selected && state === undefined}
        disabled={disabled}
        aria-current={selected && state === undefined}
        role="button"
        hasError={error !== undefined}
      >
        <Flex grow css={{ padding: theme.spacing[2] }}>
          <StyleSourceButton
            disabled={disabled || isEditing}
            isEditing={isEditing}
            tabIndex={-1}
            onClick={onSelect}
            onContextMenu={handleContextMenu}
          >
            {source === "local" ? (
              <Flex justify="center" align="center">
                <Box
                  // We need this so that the small local button has a bigger clickable surface
                  css={{ position: "absolute", inset: 0 }}
                />
                <LocalStyleIcon showDot={hasStyles} />
              </Flex>
            ) : (
              <Flex align="center" justify="center" gap="1">
                <EditableText
                  isEditing={isEditing}
                  onChangeEditing={onChangeEditing}
                  onChangeValue={onChangeValue}
                  value={label}
                />
                {hasStyles === false && isEditing === false && (
                  <LocalStyleIcon showDot={hasStyles} />
                )}
              </Flex>
            )}
          </StyleSourceButton>
        </Flex>
        {stateLabel !== undefined && (
          <Tooltip content={state || stateLabel} side="top">
            <StyleSourceState source={source}>{stateLabel}</StyleSourceState>
          </Tooltip>
        )}
        {showMenu && menu}
      </StyleSourceContainer>
    </Tooltip>
  );
};
