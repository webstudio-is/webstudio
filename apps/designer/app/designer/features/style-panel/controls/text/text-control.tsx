import { ChangeEvent } from "react";
import {
  Grid,
  IconButton,
  TextField,
  Tooltip,
} from "@webstudio-is/design-system";
import { PropertyName } from "../../shared/property-name";
import { getFinalValue } from "../../shared/get-final-value";
import { useIsFromCurrentBreakpoint } from "../../shared/use-is-from-current-breakpoint";
import { ControlProps } from "../../style-sections";
import { iconConfigs } from "../../shared/configs";

export const TextControl = ({
  currentStyle,
  inheritedStyle,
  setProperty,
  styleConfig,
  category,
}: ControlProps) => {
  const isCurrentBreakpoint = useIsFromCurrentBreakpoint(styleConfig.property);

  const value = getFinalValue({
    currentStyle,
    inheritedStyle,
    property: styleConfig.property,
  });

  if (value === undefined) return null;

  const setValue = setProperty(styleConfig.property);

  const props = isNaN(parseFloat(String(value.value)))
    ? {
        type: "text",
        spellCheck: "false",
        onChange: (event: ChangeEvent<HTMLInputElement>) => {
          setValue(event.target.value);
        },
      }
    : {
        type: "number",
        onChange: (event: ChangeEvent<HTMLInputElement>) => {
          setValue(event.target.value + "px");
        },
      };
  const Icon = iconConfigs[styleConfig.property]?.normal || "noscript";
  return (
    <Grid
      css={{
        gridTemplateColumns: "repeat(4, 1fr)",
        gridTemplateRows: "repeat(1, 1fr)",
      }}
    >
      <Tooltip
        content={styleConfig.label}
        delayDuration={700 / 4}
        disableHoverableContent={true}
      >
        <IconButton
          variant="ghost"
          size="1"
          css={{
            zIndex: 1,
            gridArea: "1 / 1 / 2 / 2",
            margin: 3,
            borderRadius: 2,
            height: "calc($sizes$6 - 6px)",
            width: "calc($sizes$6 - 6px)",
            "&:focus": {
              boxShadow: "none",
            },
            ...(isCurrentBreakpoint && {
              bc: "$colors$blue4",
              "& svg *": {
                fill: "$colors$blue11",
              },
            }),
          }}
        >
          <Icon />
        </IconButton>
      </Tooltip>
      <TextField
        {...props}
        value={value.value}
        css={{
          height: "$6",
          fontWeight: "500",
          paddingLeft: "calc($sizes$6 + 6px)",
          gridArea: "1 / 1 / -1 / -1",
          cursor: "default",
        }}
      />
    </Grid>
  );
};
