import { ChangeEvent } from "react";
import {
  Text,
  Grid,
  IconButton,
  Button,
  TextField,
  Tooltip,
} from "@webstudio-is/design-system";
import { getFinalValue } from "../../shared/get-final-value";
import { useIsFromCurrentBreakpoint } from "../../shared/use-is-from-current-breakpoint";
import { ControlProps } from "../../style-sections";
import { iconConfigs, StyleConfig } from "../../shared/configs";
import type { StyleValue, Unit } from "@webstudio-is/react-sdk";
import { ChevronDownIcon } from "@webstudio-is/icons";

const CSSGridLeft = {
  gridArea: "1 / 1 / 2 / 2",
};

const CSSGridRight = {
  gridArea: "-1 / -1 / -2 / -2",
};

const CSSIconButton = {
  zIndex: 1,
  borderRadius: 2,
  height: "calc($sizes$6 - 6px)",
  width: "calc($sizes$6 - 6px)",
  transform: "translate(3px, 3px)",
  "&:focus": {
    boxShadow: "none",
  },
};

const CSSTextUnit = {
  fontSize: "$1",
  cursor: "default",
};

const CSSTextField = {
  height: "$6",
  fontWeight: "500",
  paddingLeft: "calc($sizes$6 + 6px)",
  gridArea: "1 / 1 / -1 / -1",
  cursor: "default",
};

export const TextControl = ({
  currentStyle,
  inheritedStyle,
  setProperty,
  styleConfig,
}: ControlProps) => {
  const isCurrentBreakpoint = useIsFromCurrentBreakpoint(styleConfig.property);

  const value = getFinalValue({
    currentStyle,
    inheritedStyle,
    property: styleConfig.property,
  });

  if (value === undefined) return null;

  const setValue = setProperty(styleConfig.property);

  const Icon = iconConfigs[styleConfig.property]?.normal || "noscript";

  return (
    <Grid
      css={{
        gridTemplateColumns: "$sizes$6 auto $sizes$6",
        gridTemplateRows: "repeat(1, 1fr)",
      }}
    >
      <Tooltip
        content={styleConfig.label}
        delayDuration={700 / 4}
        disableHoverableContent={true}
      >
        {/* @todo unite values should feature the ScrubControl */}
        <IconButton
          variant="ghost"
          size="1"
          css={{
            ...CSSGridLeft,
            ...CSSIconButton,
            ...(isCurrentBreakpoint && {
              bc: "$colors$blue4",
              color: "$colors$blue11",
            }),
          }}
        >
          <Icon />
        </IconButton>
      </Tooltip>
      <TextField
        spellCheck={false}
        value={value.value}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          setValue(event.target.value)
        }
        css={CSSTextField}
      />
      {value.type === "unit" ? (
        <Units value={value.unit} />
      ) : (
        <Items
          value={value.value}
          items={styleConfig.items}
          onChange={() => {}}
        />
      )}
    </Grid>
  );
};

// @todo open unit menu on click
const Units = ({ value }: { value: Unit }) => {
  return (
    <IconButton
      css={{
        ...CSSGridRight,
        ...CSSIconButton,
      }}
    >
      <Text css={CSSTextUnit}>{value === "number" ? "—" : value}</Text>
    </IconButton>
  );
};

// @todo open items menu on click
const Items = ({
  value,
  items,
}: {
  value: StyleValue["value"];
  items: StyleConfig["items"];
  onChange: (value: string) => void;
}) => {
  if (!items) return null;
  return (
    <IconButton
      css={{
        ...CSSGridRight,
        ...CSSIconButton,
      }}
    >
      <ChevronDownIcon />
    </IconButton>
  );
};
