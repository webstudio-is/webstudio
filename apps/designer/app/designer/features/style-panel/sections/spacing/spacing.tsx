import { useEffect, useState } from "react";
import { categories } from "@webstudio-is/react-sdk";
import type { StyleProperty, StyleValue } from "@webstudio-is/css-data";
import { Box } from "@webstudio-is/design-system";
import { toValue } from "@webstudio-is/css-engine";
import { SetProperty } from "../../shared/use-style-data";
import { useIsFromCurrentBreakpoint } from "../../shared/use-is-from-current-breakpoint";
import { propertyNameColorForSelectedBreakpoint } from "../../shared/constants";
import { getFinalValue } from "../../shared/get-final-value";
import type { RenderCategoryProps } from "../../style-sections";

type SpacingSingularStyle = { [property in SpacingProperty]?: StyleValue };

type SpacingStyles = {
  paddings: SpacingSingularStyle;
  margins: SpacingSingularStyle;
};

type SpacingProperty = Margin | Padding;

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
    fontSize: "$fontSize$3",
    // @todo use a color from design system
    color: "rgb(217, 217, 217)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  wrapper: {
    display: "grid",
    height: 130,
    gridTemplateColumns:
      "$spacing$11 $spacing$3 $spacing$11 1fr $spacing$11 $spacing$3 $spacing$11",
    gridTemplateRows:
      "$spacing$11 $spacing$3 $spacing$11 1fr $spacing$11 $spacing$3 $spacing$11",
  },
  input: {
    fontSize: "$fontSize$2",
    fontWeight: 400,
    fontFamily: "inherit",
    display: "block",
    background: "transparent",
    color: "$hiContrast",
    margin: "auto",
    // @todo need to fit more chars
    width: 40,
    border: "none",
    textAlign: "center",
    outline: "none",
    // No idea why it's hidden otherwise
    zIndex: 0,
  },
  inputFromCurrentBreakpoint: {
    color: propertyNameColorForSelectedBreakpoint,
  },
  emptySpace: {
    gridArea: "2 / 2 / 3 / 2",
    background: "$loContrast",
    width: "$spacing$13",
    margin: "auto",
    height: "100%",
    borderRadius: "$borderRadius$4",
  },
  marginGrid: {
    gridArea: "1 / 1 / -1 / -1",
    display: "grid",
    gridTemplateColumns: "$spacing$11 1fr $spacing$11",
    gridTemplateRows: "$spacing$11 minmax($spacing$9, 1fr) $spacing$11",
    height: 130,
    backgroundColor: "$gray6",
    borderRadius: "$borderRadius$4",
    px: 2,
  },
  text: {
    fontWeight: "bold",
    color: "$gray12",
    fontSize: "$fontSize$1",
    margin: "$spacing$3",
  },
  paddingGrid: {
    gridArea: "3 / 3 / span 3 / span 3",
    display: "grid",
    gridTemplateColumns: "$spacing$11 1fr $spacing$11",
    gridTemplateRows: "$spacing$11 minmax($spacing$9, 1fr) $spacing$11",
    border: "2px solid",
    borderColor: "$loContrast",
    borderRadius: "$borderRadius$4",
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
    if (value === undefined) {
      continue;
    }
    css[property] = toValue(value);
  }
  return css;
};

type SpacingWidgetProps = {
  setProperty: SetProperty;
  values: SpacingStyles;
};

const SpacingWidget = ({ setProperty, values }: SpacingWidgetProps) => {
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

export const SpacingSection = ({
  currentStyle,
  inheritedStyle,
  setProperty,
}: RenderCategoryProps) => {
  const styles = categories.spacing.properties.reduce(
    (acc: SpacingStyles, property: SpacingProperty): SpacingStyles => {
      const value = getFinalValue({
        currentStyle,
        inheritedStyle,
        property,
      });
      if (value !== undefined) {
        if (property.includes("margin")) {
          acc.margins[property] = value;
        } else {
          acc.paddings[property] = value;
        }
      }

      return acc;
    },
    { margins: {}, paddings: {} } as SpacingStyles
  );

  return <SpacingWidget setProperty={setProperty} values={styles} />;
};
