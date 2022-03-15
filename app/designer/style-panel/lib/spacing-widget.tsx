import { Box } from "~/shared/design-system";
import {
  buildCss,
  type StyleProperty,
  type StyleValue,
} from "@webstudio-is/sdk";
import { SetProperty } from "../use-style-data";

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

const cleanValueForCSS = (value: string) => {
  const isNum = /^\d+$/.test(value);
  const isOnlyText = /^[A-Za-z]+$/.test(value);

  if (isNum) return `${value.toString()}px`;
  if (isOnlyText) return "0px";

  return value;
};

type SpacingWidgetProps = {
  setProperty: SetProperty;
  values: SpacingStyles;
};

export const SpacingWidget = ({ setProperty, values }: SpacingWidgetProps) => {
  const margins = buildCss(values.margins);
  const paddings = buildCss(values.paddings);

  const updateSpacing = ({
    value,
    property,
  }: {
    value: string;
    property: StyleProperty;
  }) => {
    setProperty(property)(cleanValueForCSS(value));
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
            <Box
              as="input"
              name={property}
              aria-label={`${property} edit`}
              value={margins[property]?.toString()}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                updateSpacing({
                  value: event.target.value,
                  property,
                })
              }
              css={styles.input}
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
            <Box
              as="input"
              name={property}
              aria-label={`${property} edit`}
              value={paddings[property]?.toString()}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                updateSpacing({
                  value: event.target.value,
                  property,
                })
              }
              css={styles.input}
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
