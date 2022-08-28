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

const CSSGridLeft = {
  "& ~ input": {
    paddingLeft: "calc($sizes$6 + 6px)",
  },
  gridArea: "1 / 1 / 2 / 2",
};

const CSSGridRight = {
  gridArea: "-1 / -1 / -2 / -2",
  "& ~ input": {
    paddingRight: "calc($sizes$5 + 6px)",
  },
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
  paddingLeft: "calc($sizes$1 + 6px)",
  gridArea: "1 / 1 / -1 / -1",
  cursor: "default",
};

export const TextControl = ({
  category,
  currentStyle,
  inheritedStyle,
  setProperty,
  styleConfig,
}: ControlProps) => {
  const numericScrubRef = useRef<{ disconnectedCallback: () => void }>();
  const isCurrentBreakpoint = useIsFromCurrentBreakpoint(styleConfig.property);

  const value = getFinalValue({
    currentStyle,
    inheritedStyle,
    property: styleConfig.property,
  });

  if (value === undefined) return null;

  // @todo setValue has a latency issue when updating a value fast(i.e keyboard arrows/scrub control)
  const setValue = setProperty(styleConfig.property);

  let Icon;

  const { label, property } = styleConfig;

  // @todo this silo's the flex section
  let multiColumn = true;
  if (
    category === "layout" &&
    property.includes("Gap") &&
    (currentStyle.display?.value as string).includes("flex")
  ) {
    Icon = iconConfigs[styleConfig.property]?.normal;
    multiColumn = false;
  }
  return (
    <Grid columns={multiColumn ? 2 : 1}>
      {multiColumn && <PropertyName property={property} label={label} />}
      <Grid
        css={{
          gridTemplateColumns: "$sizes$6 auto $sizes$6",
          gridTemplateRows: "repeat(1, 1fr)",
        }}
      >
        {Icon && (
          <Tooltip
            content={styleConfig.label}
            delayDuration={200}
            disableHoverableContent={true}
          >
            <IconButton
              onPointerEnter={({ target }) => {
                if (value.type !== "unit") return;
                numericScrubRef.current =
                  numericScrubRef.current ||
                  numericScrubControl(target as HTMLInputElement, {
                    initialValue: value.value as number,
                    onValueChange: ({ value }) => setValue(String(value)),
                  });
              }}
              onPointerLeave={() => {
                if (value.type !== "unit") return;
                numericScrubRef.current?.disconnectedCallback();
                numericScrubRef.current = undefined;
              }}
              variant="ghost"
              size="1"
              css={{
                ...CSSGridLeft,
                ...CSSIconButton,
                ...(isCurrentBreakpoint && {
                  bc: "$colors$blue4",
                  "&:not(:hover)": {
                    color: "$colors$blue11",
                  },
                }),
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
          />
        ) : (
          <Items
            value={value.value}
            items={styleConfig.items}
            onChange={(item) => setValue(item)}
          />
        )}
        <TextField
          css={CSSTextField}
          spellCheck={false}
          value={value.value}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            setValue(event.target.value)
          }
          onFocus={(event: FocusEvent<HTMLInputElement>) =>
            event.target.select()
          }
          onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
            if (value.type !== "unit") return;
            if (!["ArrowUp", "ArrowDown"].includes(event.code)) return;
            event.preventDefault();
            let currentValue = value.value;
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
            setValue(currentValueAsString);
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
}: {
  value: Unit;
  items: StyleConfig["items"];
  onChange?: (value: string) => void;
}) => {
  return (
    <Box
      css={{
        ...CSSGridRight,
        button: { ...CSSIconButton },
      }}
    >
      <IconButtonWithMenu
        icon={<Text css={CSSTextUnit}>{value === "number" ? "—" : value}</Text>}
        items={items}
        value={String(value)}
        onChange={onChange}
      ></IconButtonWithMenu>
    </Box>
  );
};

const Items = ({
  value,
  items,
  onChange,
}: {
  value: StyleValue["value"];
  items: StyleConfig["items"];
  onChange?: (value: string) => void;
}) => {
  if (!items?.length) return null;
  return (
    <Box
      css={{
        ...CSSGridRight,
        button: { ...CSSIconButton },
      }}
    >
      <IconButtonWithMenu
        icon={<ChevronDownIcon />}
        items={items}
        value={String(value)}
        onChange={onChange}
      ></IconButtonWithMenu>
    </Box>
  );
};
