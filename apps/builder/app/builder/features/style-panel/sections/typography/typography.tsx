import {
  Flex,
  Grid,
  EnhancedTooltip,
  theme,
  IconButton,
  rawTheme,
} from "@webstudio-is/design-system";
import { toValue, type StyleProperty } from "@webstudio-is/css-engine";
import type { SectionProps } from "../shared/section";
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
import { ToggleGroupControl } from "../../controls/toggle-group/toggle-group-control";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import { type StyleInfo } from "../../shared/style-info";
import { CollapsibleSection, getDots } from "../../shared/collapsible-section";
import { forwardRef, type ComponentProps } from "react";

export const properties = [
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
] satisfies Array<StyleProperty>;

export const Section = (props: SectionProps) => {
  return (
    <CollapsibleSection
      label="Typography"
      currentStyle={props.currentStyle}
      properties={properties}
    >
      <Flex gap="2" direction="column">
        <TypographySectionFont {...props} />
        <TypographySectionSizing {...props} />
        <TypographySectionAdvanced {...props} />
      </Flex>
    </CollapsibleSection>
  );
};

export const TypographySectionFont = (props: SectionProps) => {
  const { currentStyle, setProperty, deleteProperty } = props;

  return (
    <Grid css={{ gridTemplateColumns: "4fr 6fr" }} gap={2}>
      <PropertyName
        style={currentStyle}
        label="Family"
        properties={["fontFamily"]}
        onReset={() => deleteProperty("fontFamily")}
      />
      <FontFamilyControl
        property="fontFamily"
        currentStyle={currentStyle}
        setProperty={setProperty}
        deleteProperty={deleteProperty}
      />
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
  );
};

export const TypographySectionSizing = (props: SectionProps) => {
  const { currentStyle, setProperty, deleteProperty } = props;

  return (
    <Grid gap="2" css={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
      <Grid gap="1">
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
      <Grid gap="1">
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
      <Grid gap="1">
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

export const TypographySectionAdvanced = (props: SectionProps) => {
  const { currentStyle } = props;
  const textAlignValue = toValue(currentStyle.textAlign?.value);
  return (
    <Grid gap="2" columns="2" align="end">
      <ToggleGroupControl
        {...props}
        property="textAlign"
        value={
          // Convert to logical props
          textAlignValue === "left"
            ? "start"
            : textAlignValue === "right"
            ? "end"
            : textAlignValue
        }
        items={[
          {
            child: <TextAlignLeftIcon />,
            title: "Text Align",
            description: "Aligns the text based on the writing direction.",
            value: "start",
            propertyValues: "text-align: start;",
          },
          {
            child: <TextAlignCenterIcon />,
            title: "Text Align",
            description: "Centers the text horizontally within its container.",
            value: "center",
            propertyValues: "text-align: center;",
          },
          {
            child: <TextAlignRightIcon />,
            title: "Text Align",
            description: "Aligns the text based on the writing direction.",
            value: "end",
            propertyValues: "text-align: end;",
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
        {...props}
        property="textDecorationLine"
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
      <ToggleGroupControl
        {...props}
        property="textTransform"
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
      <Grid align="end" gap="1" css={{ gridTemplateColumns: "3fr 1fr" }}>
        <ToggleGroupControl
          {...props}
          property="fontStyle"
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

const AdvancedOptionsButton = forwardRef<
  HTMLButtonElement,
  ComponentProps<typeof IconButton> & {
    currentStyle: StyleInfo;
    properties: StyleProperty[];
    /** https://www.radix-ui.com/docs/primitives/components/collapsible#trigger */
    "data-state"?: "open" | "closed";
  }
>(({ currentStyle, properties, ...rest }, ref) => {
  const dots = getDots(currentStyle, properties);
  const finalDots = rest["data-state"] === "open" ? [] : dots ?? [];
  const dotColors = {
    local: rawTheme.colors.foregroundLocalFlexUi,
    overwritten: rawTheme.colors.foregroundOverwrittenFlexUi,
    remote: rawTheme.colors.foregroundRemoteFlexUi,
  };

  const colors = finalDots.map((dot) => dotColors[dot]);

  return (
    <Flex>
      <EnhancedTooltip content="More typography options">
        <IconButton {...rest} ref={ref}>
          <EllipsesIcon colors={colors} />
        </IconButton>
      </EnhancedTooltip>
    </Flex>
  );
});
AdvancedOptionsButton.displayName = "AdvancedOptionsButton";

export const TypographySectionAdvancedPopover = (props: SectionProps) => {
  const { deleteProperty, setProperty, currentStyle } = props;
  const properties = {
    whiteSpace: "whiteSpace",
    direction: "direction",
    hyphens: "hyphens",
    textOverflow: "textOverflow",
  } as const;

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
              properties={[properties.whiteSpace]}
              label="White Space"
              onReset={() => deleteProperty(properties.whiteSpace)}
            />
            <SelectControl
              property={properties.whiteSpace}
              currentStyle={currentStyle}
              setProperty={setProperty}
              deleteProperty={deleteProperty}
            />
          </Grid>
          <Grid css={{ gridTemplateColumns: "4fr auto" }}>
            <PropertyName
              style={currentStyle}
              properties={[properties.direction]}
              label="Direction"
              onReset={() => deleteProperty(properties.direction)}
            />
            <ToggleGroupControl
              {...props}
              property={properties.direction}
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
              properties={[properties.hyphens]}
              label="Hyphens"
              onReset={() => deleteProperty(properties.hyphens)}
            />
            <ToggleGroupControl
              {...props}
              property={properties.hyphens}
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
              properties={[properties.textOverflow]}
              label="Text Overflow"
              onReset={() => deleteProperty(properties.textOverflow)}
            />
            <ToggleGroupControl
              {...props}
              property={properties.textOverflow}
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
      <AdvancedOptionsButton
        currentStyle={currentStyle}
        properties={Object.values(properties)}
      />
    </FloatingPanel>
  );
};
