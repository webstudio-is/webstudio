import {
  Flex,
  Grid,
  DeprecatedIconButton,
  Tooltip,
  theme,
} from "@webstudio-is/design-system";
import { toValue } from "@webstudio-is/css-engine";
import type { StyleProperty } from "@webstudio-is/css-data";
import type { RenderCategoryProps } from "../../style-sections";
import { PropertyName } from "../../shared/property-name";
import {
  ColorControl,
  FontFamilyControl,
  FontWeightControl,
  SelectControl,
  TextControl,
} from "../../controls";
import {
  CrossSmallIcon,
  EllipsesIcon,
  TextDirectionLTRIcon,
  TextDirectionRTLIcon,
  TextAlignCenterIcon,
  TextAlignJustifyIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
  TextCapitalizeIcon,
  TextHyphenIcon,
  TextItalicIcon,
  TextLowercaseIcon,
  TextStrikethroughIcon,
  TextTruncateIcon,
  TextUnderlineIcon,
  TextUppercaseIcon,
} from "@webstudio-is/icons";
import { ToggleGroupControl } from "../../controls/toggle/toggle-control";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import { getStyleSource } from "../../shared/style-info";
import { CollapsibleSection } from "../../shared/collapsible-section";

const properties: StyleProperty[] = [
  "fontFamily",
  "fontWeight",
  "fontSize",
  "lineHeight",
  "color",
  "textAlign",
  "fontStyle",
  "textDecorationLine",
  "letterSpacing",
  "textTransform",
  "direction",
  "whiteSpace",
  "textOverflow",
  "hyphens",
];

export const TypographySection = (props: RenderCategoryProps) => {
  return (
    <CollapsibleSection
      label="Typography"
      currentStyle={props.currentStyle}
      properties={properties}
    >
      <Flex css={{ gap: theme.spacing[7] }} direction="column">
        <TypographySectionFont {...props} />
        <TypographySectionSizing {...props} />
        <TypographySectionAdvanced {...props} />
      </Flex>
    </CollapsibleSection>
  );
};

export const TypographySectionFont = (props: RenderCategoryProps) => {
  const { currentStyle, setProperty, deleteProperty } = props;

  return (
    <Grid
      css={{
        gap: theme.spacing[5],
      }}
    >
      <Grid css={{ gridTemplateColumns: "4fr 6fr" }} gap={2}>
        <PropertyName
          style={currentStyle}
          label="Font"
          properties={["fontFamily"]}
          onReset={() => deleteProperty("fontFamily")}
        />
        <FontFamilyControl
          property="fontFamily"
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />
      </Grid>
      <Grid css={{ gridTemplateColumns: "4fr 6fr" }} gap={2}>
        <PropertyName
          style={currentStyle}
          label="Weight"
          properties={["fontWeight"]}
          onReset={() => deleteProperty("fontWeight")}
        />
        <FontWeightControl
          property="fontWeight"
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />
      </Grid>
      <Grid css={{ gridTemplateColumns: "4fr 6fr" }} gap={2}>
        <PropertyName
          style={currentStyle}
          label="Color"
          properties={["color"]}
          onReset={() => deleteProperty("color")}
        />
        <ColorControl
          property="color"
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />
      </Grid>
    </Grid>
  );
};

export const TypographySectionSizing = (props: RenderCategoryProps) => {
  const { currentStyle, setProperty, deleteProperty } = props;

  return (
    <Grid
      css={{
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: theme.spacing[5],
      }}
    >
      <Grid css={{ gridTemplateColumns: "auto", gap: theme.spacing[3] }}>
        <PropertyName
          style={currentStyle}
          properties={["fontSize"]}
          label="Size"
          onReset={() => deleteProperty("fontSize")}
        />
        <TextControl
          property="fontSize"
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />
      </Grid>
      <Grid css={{ gridTemplateColumns: "auto", gap: theme.spacing[3] }}>
        <PropertyName
          style={currentStyle}
          properties={["lineHeight"]}
          label="Height"
          onReset={() => deleteProperty("lineHeight")}
        />
        <TextControl
          property="lineHeight"
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />
      </Grid>
      <Grid css={{ gridTemplateColumns: "auto", gap: theme.spacing[3] }}>
        <PropertyName
          style={currentStyle}
          properties={["letterSpacing"]}
          label="Spacing"
          onReset={() => deleteProperty("letterSpacing")}
        />
        <TextControl
          property="letterSpacing"
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />
      </Grid>
    </Grid>
  );
};

export const TypographySectionAdvanced = (props: RenderCategoryProps) => {
  const { setProperty, deleteProperty, currentStyle } = props;
  const setTextAlign = setProperty("textAlign");
  const setTextDecorationLine = setProperty("textDecorationLine");
  const setTextTransform = setProperty("textTransform");
  const setFontStyle = setProperty("fontStyle");

  return (
    <Grid
      css={{
        gap: theme.spacing[5],
      }}
    >
      <Grid
        css={{
          gridTemplateColumns: "1fr 1fr",
          gap: theme.spacing[9],
        }}
      >
        <ToggleGroupControl
          style={currentStyle}
          styleSource={getStyleSource(currentStyle.textAlign)}
          onValueChange={(value) => setTextAlign({ type: "keyword", value })}
          onReset={() => deleteProperty("textAlign")}
          value={String(getTextAlign(toValue(currentStyle.textAlign?.value)))}
          properties={["textAlign"]}
          items={[
            {
              child: <TextAlignLeftIcon />,
              title: "Text Align",
              description: "Aligns the text based on the writing direction.",
              value: "start",
              propertyValues: "text-align: left;",
            },
            {
              child: <TextAlignCenterIcon />,
              title: "Text Align",
              description:
                "Centers the text horizontally within its container.",
              value: "center",
              propertyValues: "text-align: center;",
            },
            {
              child: <TextAlignRightIcon />,
              title: "Text Align",
              description: "Aligns the text based on the writing direction.",
              value: "end",
              propertyValues: "text-align: right;",
            },
            {
              child: <TextAlignJustifyIcon />,
              title: "Text Align",
              description:
                "Adjusts word spacing to align text to both the left and right edges of the container",
              value: "justify",
              propertyValues: "text-align: justify;",
            },
          ]}
        />
        <ToggleGroupControl
          style={currentStyle}
          styleSource={getStyleSource(currentStyle.textDecorationLine)}
          onValueChange={(value) =>
            setTextDecorationLine({ type: "keyword", value })
          }
          onReset={() => deleteProperty("textDecorationLine")}
          properties={["textDecorationLine"]}
          value={toValue(currentStyle.textDecorationLine?.value)}
          items={[
            {
              child: <CrossSmallIcon />,
              title: "Text Decoration Line",
              description: "No decoration is applied to the text.",
              value: "none",
              propertyValues: "text-decoration-line: none;",
            },
            {
              title: "Text Decoration Line",
              child: <TextUnderlineIcon />,
              description: " Adds a horizontal line underneath the text.",
              value: "underline",
              propertyValues: "text-decoration-line: underline;",
            },
            {
              title: "Text Decoration Line",
              child: <TextStrikethroughIcon />,
              description:
                "Draws a horizontal line through the middle of the text.",
              value: "line-through",
              propertyValues: "text-decoration-line: line-through;",
            },
          ]}
        />
      </Grid>
      <Grid
        css={{
          gridTemplateColumns: "1fr 1fr auto",
          gap: theme.spacing[9],
          alignItems: "center",
        }}
      >
        <ToggleGroupControl
          style={currentStyle}
          styleSource={getStyleSource(currentStyle.textTransform)}
          onValueChange={(value) =>
            setTextTransform({ type: "keyword", value })
          }
          properties={["textTransform"]}
          onReset={() => deleteProperty("textTransform")}
          value={toValue(currentStyle.textTransform?.value)}
          items={[
            {
              child: <CrossSmallIcon />,
              title: "Text Transform",
              description:
                "No transformation is applied to the text. The text appears as it is.",
              value: "none",
              propertyValues: "text-transform: none;",
            },
            {
              child: <TextUppercaseIcon />,
              title: "Text Transform",
              description:
                "Transforms the text to appear in all uppercase letters.",
              value: "uppercase",
              propertyValues: "text-transform: uppercase;",
            },
            {
              child: <TextCapitalizeIcon />,
              title: "Text Transform",
              description:
                "Transforms the first character of each word to uppercase, while the remaining characters are in lowercase.",
              value: "capitalize",
              propertyValues: "text-transform: capitalize;",
            },
            {
              child: <TextLowercaseIcon />,
              title: "Text Transform",
              description:
                " Transforms the text to appear in all lowercase letters.",
              value: "lowercase",
              propertyValues: "text-transform: lowercase;",
            },
          ]}
        />
        <ToggleGroupControl
          style={currentStyle}
          styleSource={getStyleSource(currentStyle.fontStyle)}
          onValueChange={(value) => setFontStyle({ type: "keyword", value })}
          onReset={() => deleteProperty("fontStyle")}
          properties={["fontStyle"]}
          value={toValue(currentStyle.fontStyle?.value)}
          items={[
            {
              child: <CrossSmallIcon />,
              title: "Font Style",
              description:
                "The default value. The text appears in a normal, upright style.",
              value: "normal",
              propertyValues: "font-style: normal;",
            },
            {
              child: <TextItalicIcon />,
              title: "Font Style",
              description:
                "The text appears in italic style, where it is slanted to the right.",
              value: "italic",
              propertyValues: "font-style: italic;",
            },
          ]}
        />
        <TypographySectionAdvancedPopover {...props} />
      </Grid>
    </Grid>
  );
};

export const TypographySectionAdvancedPopover = (
  props: RenderCategoryProps
) => {
  const { deleteProperty, setProperty, currentStyle } = props;
  const setDirection = setProperty("direction");
  const setTextOverflow = setProperty("textOverflow");
  const setHyphens = setProperty("hyphens");
  return (
    <FloatingPanel
      title="Advanced Typography"
      content={
        <Grid
          css={{
            padding: theme.spacing[9],
            gap: theme.spacing[9],
            width: theme.spacing[30],
          }}
        >
          <Grid css={{ gridTemplateColumns: "4fr 6fr" }} gap={2}>
            <PropertyName
              style={currentStyle}
              properties={["whiteSpace"]}
              label="White Space"
              onReset={() => deleteProperty("whiteSpace")}
            />
            <SelectControl
              property="whiteSpace"
              currentStyle={currentStyle}
              setProperty={setProperty}
              deleteProperty={deleteProperty}
            />
          </Grid>
          <Grid css={{ gridTemplateColumns: "4fr auto" }}>
            <PropertyName
              style={currentStyle}
              properties={["direction"]}
              label="Direction"
              onReset={() => deleteProperty("direction")}
            />
            <ToggleGroupControl
              style={currentStyle}
              onValueChange={(value) =>
                setDirection({ type: "keyword", value })
              }
              value={toValue(currentStyle.direction?.value)}
              items={[
                {
                  child: <TextDirectionLTRIcon />,
                  title: "Direction",
                  description:
                    "Sets the text direction to left-to-right, which is the default for most languages.",
                  value: "ltr",
                  propertyValues: "direction: ltr;",
                },
                {
                  child: <TextDirectionRTLIcon />,
                  title: "Direction",
                  description:
                    "Sets the text direction to right-to-left, typically used for languages such as Arabic or Hebrew.",
                  value: "rtl",
                  propertyValues: "direction: rtl;",
                },
              ]}
            />
          </Grid>
          <Grid css={{ gridTemplateColumns: "4fr auto" }}>
            <PropertyName
              style={currentStyle}
              properties={["hyphens"]}
              label="Hyphens"
              onReset={() => deleteProperty("hyphens")}
            />
            <ToggleGroupControl
              style={currentStyle}
              onValueChange={(value) => setHyphens({ type: "keyword", value })}
              value={toValue(currentStyle.hyphens?.value)}
              items={[
                {
                  child: <CrossSmallIcon />,
                  title: "Hyphens",
                  description:
                    "Disables hyphenation of words. Words will not be hyphenated even if they exceed the width of their container.",
                  value: "manual",
                  propertyValues: "hyphens: none;",
                },
                {
                  child: <TextHyphenIcon />,
                  title: "Hyphens",
                  description:
                    "Enables automatic hyphenation of words. The browser will hyphenate long words at appropriate points to fit within the width of their container.",
                  value: "auto",
                  propertyValues: "hyphens: auto;",
                },
              ]}
            />
          </Grid>
          <Grid css={{ gridTemplateColumns: "4fr auto" }}>
            <PropertyName
              style={currentStyle}
              properties={["textOverflow"]}
              label="Text Overflow"
              onReset={() => deleteProperty("textOverflow")}
            />
            <ToggleGroupControl
              style={currentStyle}
              onValueChange={(value) =>
                setTextOverflow({ type: "keyword", value })
              }
              value={toValue(currentStyle.textOverflow?.value)}
              items={[
                {
                  child: <CrossSmallIcon />,
                  title: "Text Overflow",
                  description:
                    "The overflowing text is clipped and hidden without any indication.",
                  value: "clip",
                  propertyValues: "text-overflow: clip;",
                },
                {
                  child: <TextTruncateIcon />,
                  title: "Text Overflow",
                  description:
                    "The overflowing text is truncated with an ellipsis (...) to indicate that there is more content. To make the text-overflow: ellipsis property work, you need to set the following CSS properties: white-space: nowrap; overflow: hidden;",
                  value: "ellipsis",
                  propertyValues: "text-overflow: ellipsis;",
                },
              ]}
            />
          </Grid>
        </Grid>
      }
    >
      <Flex>
        <Tooltip content="More typography options" delayDuration={0}>
          <DeprecatedIconButton>
            <EllipsesIcon />
          </DeprecatedIconButton>
        </Tooltip>
      </Flex>
    </FloatingPanel>
  );
};

const getTextAlign = (value: string) => {
  switch (value) {
    case "left":
      return "start";
    case "right":
      return "end";
    default:
      return value;
  }
};
