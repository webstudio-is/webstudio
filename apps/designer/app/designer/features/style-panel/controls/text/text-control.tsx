import { ChangeEvent, FocusEvent, KeyboardEvent, useRef } from "react";
import {
  Box,
  Text,
  Grid,
  IconButton,
  TextField,
  Tooltip,
  IconButtonWithMenu,
  numericScrubControl,
} from "@webstudio-is/design-system";
import { getFinalValue } from "../../shared/get-final-value";
import { useIsFromCurrentBreakpoint } from "../../shared/use-is-from-current-breakpoint";
import { ControlProps } from "../../style-sections";
import { iconConfigs, StyleConfig } from "../../shared/configs";
import { type StyleValue, type Unit, units } from "@webstudio-is/react-sdk";
import { ChevronDownIcon } from "@webstudio-is/icons";
import { PropertyName } from "../../shared/property-name";

const commonUnitsSubset = units
  .slice(0)
  .sort((v) =>
    ["%", "px", "rem", "em", "ch", "vh", "vw", "hv", "vmin", "vmax"].includes(v)
      ? -1
      : 1
  );

const gridTemplateStyle = {
  gridTemplateColumns: "$sizes$6 auto $sizes$6",
  gridTemplateRows: "repeat(1, 1fr)",
};

const gridLeftStyle = {
  "& ~ input": {
    paddingLeft: "calc($sizes$6 + $nudge$3)",
  },
  gridArea: "1 / 1 / 2 / 2",
};

const gridRightStyle = {
  gridArea: "-1 / -1 / -2 / -2",
  "& ~ input": {
    paddingRight: "calc($sizes$5 + $nudge$3)",
  },
};

const iconButtonStyle = {
  zIndex: 1,
  borderRadius: 2,
  height: "calc($sizes$6 - $nudge$3)",
  width: "calc($sizes$6 - $nudge$3)",
  transform: "translate(3px, 3px)",
  "&:focus": {
    boxShadow: "none",
  },
};

const iconButtonActiveStyle = {
  bc: "$colors$blue4",
  "&:not(:hover)": {
    color: "$colors$blue11",
  },
};

const iconButtonGridLeftStyle = {
  ...gridLeftStyle,
  ...iconButtonStyle,
};

const iconButtonGridRightStyle = {
  ...gridRightStyle,
  "& button": { ...iconButtonStyle },
};

const textFieldStyle = {
  height: "$6",
  fontWeight: "500",
  paddingLeft: "calc($sizes$1 + $nudge$3)",
  gridArea: "1 / 1 / -1 / -1",
  cursor: "default",
};

export const TextControl = ({
  currentStyle,
  inheritedStyle,
  setProperty,
  styleConfig,
}: ControlProps) => {
  const numericScrubRef = useRef<{ disconnectedCallback: () => void }>();
  const isCurrentBreakpoint = useIsFromCurrentBreakpoint(styleConfig.property);
  const textFieldRef = useRef<HTMLInputElement>(null);

  const value = getFinalValue({
    currentStyle,
    inheritedStyle,
    property: styleConfig.property,
  });

  if (value === undefined) return null;

  const setValue = setProperty(styleConfig.property);

  const Icon = iconConfigs[styleConfig.property]?.normal;

  return (
    <Grid columns={2}>
      <PropertyName property={styleConfig.property} label={styleConfig.label} />
      <Grid css={gridTemplateStyle}>
        {Icon && (
          <Tooltip
            content={styleConfig.label}
            delayDuration={200}
            disableHoverableContent={true}
          >
            <IconButton
              onPointerEnter={(event) => {
                if (value.type !== "unit" || !textFieldRef.current) return;
                const textFieldNode = textFieldRef.current;
                numericScrubRef.current =
                  numericScrubRef.current ||
                  numericScrubControl(event.target as HTMLInputElement, {
                    minValue: 0,
                    initialValue: value.value as number,
                    onValueChange: ({ value }) => {
                      textFieldNode.value = String(value);
                      setValue(String(value), { isEphemeral: true });
                    },
                  });
              }}
              onPointerLeave={() => {
                if (value.type !== "unit") return;
                numericScrubRef.current?.disconnectedCallback();
                numericScrubRef.current = undefined;
              }}
              onPointerUp={(event) => {
                setValue((event.target as HTMLInputElement).value);
              }}
              variant="ghost"
              size="1"
              css={{
                ...iconButtonGridLeftStyle,
                ...(isCurrentBreakpoint && iconButtonActiveStyle),
              }}
            >
              {Icon && <Icon />}
            </IconButton>
          </Tooltip>
        )}
        {value.type === "unit" ? (
          <Units
            value={value.unit}
            items={commonUnitsSubset.map((unit) => ({
              name: unit,
              label: unit,
            }))}
            onChange={(unit) => setValue(value.value + unit)}
            onHover={(unit) =>
              setValue(value.value + unit, { isEphemeral: true })
            }
          />
        ) : (
          <Items
            value={value.value}
            items={styleConfig.items}
            onChange={(item) => setValue(item)}
            onHover={(item) => setValue(item, { isEphemeral: true })}
          />
        )}
        <TextField
          ref={textFieldRef}
          css={textFieldStyle}
          spellCheck={false}
          defaultValue={value.value}
          onFocus={(event: FocusEvent<HTMLInputElement>) =>
            event.target.select()
          }
          onBlur={(event: ChangeEvent<HTMLInputElement>) =>
            setValue(event.target.value)
          }
          onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
            const target = event.target as HTMLInputElement;
            if (event.code === "Enter") {
              setValue(target.value);
              const number = parseFloat(target.value);
              if (!isNaN(number)) target.value = String(number);
            }
            if (value.type !== "unit") return;
            if (!["ArrowUp", "ArrowDown"].includes(event.code)) return;
            event.preventDefault();
            let currentValue = parseFloat(target.value);
            let currentDelta = 1;
            if (event.shiftKey) currentDelta = 10;
            if (event.altKey) currentDelta = 0.1;
            if (event.code === "ArrowUp")
              currentValue = currentValue + currentDelta;
            if (event.code === "ArrowDown")
              currentValue = currentValue - currentDelta;
            const currentValueAsString =
              currentValue % 1
                ? currentValue.toPrecision(
                    Math.abs(currentValue).toString().indexOf(".") + 2
                  )
                : String(currentValue);
            target.value = currentValueAsString;
            setValue(currentValueAsString, { isEphemeral: true });
          }}
        />
      </Grid>
    </Grid>
  );
};

const Units = ({
  value,
  items,
  onChange,
  onHover,
}: {
  value: Unit;
  items: StyleConfig["items"];
  onChange?: (value: string) => void;
  onHover?: (value: string) => void;
}) => {
  return (
    <Box css={iconButtonGridRightStyle}>
      <IconButtonWithMenu
        icon={
          <Text css={{ cursor: "default" }}>
            {value === "number" ? "—" : value}
          </Text>
        }
        items={items}
        value={String(value)}
        onChange={onChange}
        onHover={onHover}
      />
    </Box>
  );
};

const Items = ({
  value,
  items,
  onChange,
  onHover,
}: {
  value: StyleValue["value"];
  items: StyleConfig["items"];
  onChange?: (value: string) => void;
  onHover?: (value: string) => void;
}) => {
  if (!items?.length) return null;
  return (
    <Box css={iconButtonGridRightStyle}>
      <IconButtonWithMenu
        icon={<ChevronDownIcon />}
        items={items}
        value={String(value)}
        onChange={onChange}
        onHover={onHover}
      />
    </Box>
  );
};
