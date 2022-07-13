import { useEffect, useState } from "react";
import {
  toValue,
  type StyleProperty,
  type StyleValue,
} from "@webstudio-is/sdk";
import { Box } from "~/shared/design-system";
import { SetProperty } from "../use-style-data";
import { useIsFromCurrentBreakpoint } from "./utils/use-is-from-current-breakpoint";
import { propertyNameColorForSelectedBreakpoint } from "./constants";

type SpacingSingularStyle = { [property in SpacingProperty]?: StyleValue };

export type SpacingStyles = {
  paddings: SpacingSingularStyle;
  margins: SpacingSingularStyle;
};

export type SpacingProperty = Margin | Padding;

type Margin = "marginTop" | "marginRight" | "marginBottom" | "marginLeft";

type Padding = "paddingTop" | "paddingRight" | "paddingBottom" | "paddingLeft";

const grid = {
  margin: {
    marginTop: "1 / 2 / 2 / 3",
    marginRight: "2 / 3 / 3 / 4",
    marginBottom: "3 / 2 / 4 / 3",
    marginLeft: "2 / 1 / 3 / 2",
  },
  padding: {
    paddingTop: "1 / 2 / 2 / 3",
    paddingRight: "2 / 3 / 3 / 4",
    paddingBottom: "3 / 2 / 4 / 3",
    paddingLeft: "2 / 1 / 3 / 2",
  },
};

const styles = {
  spacingEdit: {
    fontSize: "$1",
    // @todo use a color from design system
    color: "rgb(217, 217, 217)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  wrapper: {
    display: "grid",
    height: 130,
    gridTemplateColumns: "$5 $1 $5 1fr $5 $1 $5",
    gridTemplateRows: "$5 $1 $5 1fr $5 $1 $5",
  },
  input: {
    fontSize: 10,
    fontWeight: 400,
    fontFamily: "inherit",
    display: "block",
    background: "transparent",
    color: "$hiContrast",
    zIndex: 99,
    margin: "auto",
    // @todo need to fit more chars
    width: 40,
    border: "none",
    textAlign: "center",
    outline: "none",
  },
  inputFromCurrentBreakpoint: {
    color: propertyNameColorForSelectedBreakpoint,
  },
  emptySpace: {
    gridArea: "2 / 2 / 3 / 2",
    background: "$loContrast",
    width: "$6",
    margin: "auto",
    height: "100%",
    borderRadius: "$1",
  },
  marginGrid: {
    gridArea: "1 / 1 / -1 / -1",
    display: "grid",
    gridTemplateColumns: "$5 1fr $5",
    gridTemplateRows: "$5 minmax($3, 1fr) $5",
    height: 130,
    backgroundColor: "$gray6",
    borderRadius: "$1",
    px: 2,
  },
  text: {
    fontWeight: "bold",
    color: "$gray12",
    fontSize: 8,
    margin: "$1",
  },
  paddingGrid: {
    gridArea: "3 / 3 / span 3 / span 3",
    display: "grid",
    gridTemplateColumns: "$5 1fr $5",
    gridTemplateRows: "$5 minmax($3, 1fr) $5",
    border: "2px solid",
    borderColor: "$loContrast",
    borderRadius: "$1",
  },
};

type TextFieldProps = {
  property: StyleProperty;
  value: string | undefined;
  onEnter: (value: string) => void;
};

const TextField = ({ property, value, onEnter }: TextFieldProps) => {
  const [currentValue, setCurrentValue] = useState<string>(value ?? "");
  const isFromCurrentBreakpoint = useIsFromCurrentBreakpoint(property);

  useEffect(() => {
    setCurrentValue(value ?? "");
  }, [value]);

  return (
    <Box
      as="input"
      name={property}
      aria-label={`${property} edit`}
      value={currentValue}
      onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
          onEnter(currentValue);
        }
      }}
      onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
        setCurrentValue(event.target.value);
      }}
      css={
        isFromCurrentBreakpoint
          ? { ...styles.input, ...styles.inputFromCurrentBreakpoint }
          : styles.input
      }
    />
  );
};

const toCss = (style: SpacingSingularStyle) => {
  const css: Record<string, string> = {};
  let property: SpacingProperty;
  for (property in style) {
    const value = style[property];
    if (value === undefined) continue;
    css[property] = toValue(value);
  }
  return css;
};

type SpacingWidgetProps = {
  setProperty: SetProperty;
  values: SpacingStyles;
};

export const SpacingWidget = ({ setProperty, values }: SpacingWidgetProps) => {
  const margins = toCss(values.margins);
  const paddings = toCss(values.paddings);

  const updateSpacing = ({
    value,
    property,
  }: {
    value: string;
    property: StyleProperty;
  }) => {
    setProperty(property)(value);
  };

  return (
    <Box css={styles.wrapper}>
      <Box css={styles.marginGrid}>
        {(Object.keys(margins) as Array<Margin>).map((property: Margin) => (
          <Box
            key={property}
            css={{
              ...styles.spacingEdit,
              gridArea: grid.margin[property],
            }}
          >
            <TextField
              property={property}
              value={margins[property]}
              onEnter={(value: string) => {
                updateSpacing({
                  value,
                  property,
                });
              }}
            />
          </Box>
        ))}
      </Box>
      <Box css={styles.paddingGrid}>
        {(Object.keys(paddings) as Array<Padding>).map((property: Padding) => (
          <Box
            key={property}
            css={{
              ...styles.spacingEdit,
              gridArea: grid.padding[property],
            }}
          >
            <TextField
              property={property}
              value={paddings[property]}
              onEnter={(value: string) => {
                updateSpacing({
                  value,
                  property,
                });
              }}
            />
          </Box>
        ))}
        <Box css={styles.emptySpace} />
      </Box>
      <Box
        css={{
          ...styles.text,
          gridArea: "3 / 3 / span 3 / span 3",
        }}
      >
        PADDING
      </Box>

      <Box
        css={{
          ...styles.text,
          gridArea: "1 / 1 / -1 / -1",
        }}
      >
        MARGIN
      </Box>
    </Box>
  );
};
