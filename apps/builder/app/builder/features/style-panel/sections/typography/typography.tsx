import { forwardRef, type ComponentProps } from "react";
import {
  Flex,
  Grid,
  EnhancedTooltip,
  theme,
  IconButton,
} from "@webstudio-is/design-system";
import { propertyDescriptions } from "@webstudio-is/css-data";
import type { StyleProperty } from "@webstudio-is/css-engine";
import type { SectionProps } from "../shared/section";
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
import { getStyleSourceColor, type StyleInfo } from "../../shared/style-info";
import { StyleSection } from "../../shared/style-section";
import { PropertyLabel } from "../../property-label";

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
  "whiteSpaceCollapse",
  "textWrapMode",
  "textWrapStyle",
  "textOverflow",
  "hyphens",
] satisfies Array<StyleProperty>;

export const Section = (props: SectionProps) => {
  return (
    <StyleSection label="Typography" properties={properties}>
      <Flex gap="2" direction="column">
        <TypographySectionFont {...props} />
        <TypographySectionSizing />
        <TypographySectionAdvanced {...props} />
      </Flex>
    </StyleSection>
  );
};

export const TypographySectionFont = (props: SectionProps) => {
  const { currentStyle, setProperty, deleteProperty } = props;

  return (
    <Grid css={{ gridTemplateColumns: "4fr 6fr" }} gap={2}>
      <PropertyLabel
        label="Family"
        description={propertyDescriptions.fontFamily}
        properties={["fontFamily"]}
      />
      <FontFamilyControl
        property="fontFamily"
        currentStyle={currentStyle}
        setProperty={setProperty}
        deleteProperty={deleteProperty}
      />
      <PropertyLabel
        label="Weight"
        description={propertyDescriptions.fontWeight}
        properties={["fontWeight"]}
      />
      <FontWeightControl
        property="fontWeight"
        currentStyle={currentStyle}
        setProperty={setProperty}
        deleteProperty={deleteProperty}
      />
      <PropertyLabel
        label="Color"
        description={propertyDescriptions.color}
        properties={["color"]}
      />
      <ColorControl property="color" />
    </Grid>
  );
};

const TypographySectionSizing = () => {
  return (
    <Grid gap="2" css={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
      <Grid gap="1">
        <PropertyLabel
          label="Size"
          description={propertyDescriptions.fontSize}
          properties={["fontSize"]}
        />
        <TextControl property="fontSize" />
      </Grid>
      <Grid gap="1">
        <PropertyLabel
          label="Height"
          description={propertyDescriptions.lineHeight}
          properties={["lineHeight"]}
        />
        <TextControl property="lineHeight" />
      </Grid>
      <Grid gap="1">
        <PropertyLabel
          label="Spacing"
          description={propertyDescriptions.letterSpacing}
          properties={["letterSpacing"]}
        />
        <TextControl property="letterSpacing" />
      </Grid>
    </Grid>
  );
};

export const TypographySectionAdvanced = (props: SectionProps) => {
  return (
    <Grid gap="2" columns="2" align="end">
      <ToggleGroupControl
        properties={["textAlign"]}
        items={[
          {
            child: <TextAlignLeftIcon />,
            description: "Aligns the text based on the writing direction.",
            value: "start",
          },
          {
            child: <TextAlignCenterIcon />,
            description: "Centers the text horizontally within its container.",
            value: "center",
          },
          {
            child: <TextAlignRightIcon />,
            description: "Aligns the text based on the writing direction.",
            value: "end",
          },
          {
            child: <TextAlignJustifyIcon />,
            description:
              "Adjusts word spacing to align text to both the left and right edges of the container",
            value: "justify",
          },
        ]}
      />
      <ToggleGroupControl
        properties={["textDecorationLine"]}
        items={[
          {
            child: <CrossSmallIcon />,
            description: "No decoration is applied to the text.",
            value: "none",
          },
          {
            child: <TextUnderlineIcon />,
            description: "Adds a horizontal line underneath the text.",
            value: "underline",
          },
          {
            child: <TextStrikethroughIcon />,
            description:
              "Draws a horizontal line through the middle of the text.",
            value: "line-through",
          },
        ]}
      />
      <ToggleGroupControl
        properties={["textTransform"]}
        items={[
          {
            child: <CrossSmallIcon />,
            description:
              "No transformation is applied to the text. The text appears as it is.",
            value: "none",
          },
          {
            child: <TextUppercaseIcon />,
            description:
              "Transforms the text to appear in all uppercase letters.",
            value: "uppercase",
          },
          {
            child: <TextCapitalizeIcon />,
            description:
              "Transforms the first character of each word to uppercase, while the remaining characters are in lowercase.",
            value: "capitalize",
          },
          {
            child: <TextLowercaseIcon />,
            description:
              " Transforms the text to appear in all lowercase letters.",
            value: "lowercase",
          },
        ]}
      />
      <Grid align="end" gap="1" css={{ gridTemplateColumns: "3fr 1fr" }}>
        <ToggleGroupControl
          properties={["fontStyle"]}
          items={[
            {
              child: <CrossSmallIcon />,
              description:
                "The default value. The text appears in a normal, upright style.",
              value: "normal",
            },
            {
              child: <TextItalicIcon />,
              description:
                "The text appears in italic style, where it is slanted to the right.",
              value: "italic",
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
    onReset: () => void;
    /** https://www.radix-ui.com/docs/primitives/components/collapsible#trigger */
    "data-state"?: "open" | "closed";
  }
>(({ currentStyle, properties, onReset, onClick, ...rest }, ref) => {
  const styleSourceColor = getStyleSourceColor({
    properties,
    currentStyle,
  });
  return (
    <Flex>
      <EnhancedTooltip content="More typography options">
        <IconButton
          {...rest}
          onClick={(event) => {
            if (event.altKey) {
              onReset();
              return;
            }
            onClick?.(event);
          }}
          variant={styleSourceColor}
          ref={ref}
        >
          <EllipsesIcon />
        </IconButton>
      </EnhancedTooltip>
    </Flex>
  );
});
AdvancedOptionsButton.displayName = "AdvancedOptionsButton";

const advancedProperties: StyleProperty[] = [
  "whiteSpaceCollapse",
  "textWrapMode",
  "textWrapStyle",
  "direction",
  "hyphens",
  "textOverflow",
];

export const TypographySectionAdvancedPopover = (props: SectionProps) => {
  const { createBatchUpdate, currentStyle } = props;
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
            <PropertyLabel
              label="White Space"
              description={propertyDescriptions.whiteSpaceCollapse}
              properties={["whiteSpaceCollapse"]}
            />
            <SelectControl property="whiteSpaceCollapse" />
          </Grid>
          <Grid css={{ gridTemplateColumns: "4fr 6fr" }} gap={2}>
            <PropertyLabel
              label="Wrap Mode"
              description={propertyDescriptions.textWrapMode}
              properties={["textWrapMode"]}
            />
            <SelectControl property="textWrapMode" />
          </Grid>
          <Grid css={{ gridTemplateColumns: "4fr 6fr" }} gap={2}>
            <PropertyLabel
              label="Wrap Style"
              description={propertyDescriptions.textWrapStyle}
              properties={["textWrapStyle"]}
            />
            <SelectControl property="textWrapStyle" />
          </Grid>
          <Grid css={{ gridTemplateColumns: "4fr auto" }}>
            <PropertyLabel
              label="Direction"
              description={propertyDescriptions.direction}
              properties={["direction"]}
            />
            <ToggleGroupControl
              properties={["direction"]}
              items={[
                {
                  child: <TextDirectionLTRIcon />,
                  description:
                    "Sets the text direction to left-to-right, which is the default for most languages.",
                  value: "ltr",
                },
                {
                  child: <TextDirectionRTLIcon />,
                  description:
                    "Sets the text direction to right-to-left, typically used for languages such as Arabic or Hebrew.",
                  value: "rtl",
                },
              ]}
            />
          </Grid>
          <Grid css={{ gridTemplateColumns: "4fr auto" }}>
            <PropertyLabel
              label="Hyphens"
              description={propertyDescriptions.hyphens}
              properties={["hyphens"]}
            />
            <ToggleGroupControl
              properties={["hyphens"]}
              items={[
                {
                  child: <CrossSmallIcon />,
                  description:
                    "Disables hyphenation of words. Words will not be hyphenated even if they exceed the width of their container.",
                  value: "manual",
                },
                {
                  child: <TextHyphenIcon />,
                  description:
                    "Enables automatic hyphenation of words. The browser will hyphenate long words at appropriate points to fit within the width of their container.",
                  value: "auto",
                },
              ]}
            />
          </Grid>
          <Grid css={{ gridTemplateColumns: "4fr auto" }}>
            <PropertyLabel
              label="Text Overflow"
              description={propertyDescriptions.textOverflow}
              properties={["textOverflow"]}
            />
            <ToggleGroupControl
              properties={["textOverflow"]}
              items={[
                {
                  child: <CrossSmallIcon />,
                  description:
                    "The overflowing text is clipped and hidden without any indication.",
                  value: "clip",
                },
                {
                  child: <TextTruncateIcon />,
                  description:
                    "The overflowing text is truncated with an ellipsis (...) to indicate that there is more content. To make the text-overflow: ellipsis property work, you need to set the following CSS properties: white-space: nowrap; overflow: hidden;",
                  value: "ellipsis",
                },
              ]}
            />
          </Grid>
        </Grid>
      }
    >
      <AdvancedOptionsButton
        currentStyle={currentStyle}
        properties={advancedProperties}
        onReset={() => {
          const batch = createBatchUpdate();
          Object.values(advancedProperties).forEach((property) => {
            batch.deleteProperty(property);
          });
          batch.publish();
        }}
      />
    </FloatingPanel>
  );
};
