import { forwardRef, type ComponentProps } from "react";
import {
  Flex,
  Grid,
  EnhancedTooltip,
  theme,
  IconButton,
  Box,
  FloatingPanel,
} from "@webstudio-is/design-system";
import { propertyDescriptions } from "@webstudio-is/css-data";
import type { CssProperty } from "@webstudio-is/css-engine";
import {
  XSmallIcon,
  EllipsesIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  TextAlignCenterIcon,
  TextAlignJustifyIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
  TextCapitalizeIcon,
  MinusIcon,
  TextItalicIcon,
  TextLowercaseIcon,
  TextStrikethroughIcon,
  TextTruncateIcon,
  TextUnderlineIcon,
  TextUppercaseIcon,
} from "@webstudio-is/icons";
import { ToggleGroupControl } from "../../controls/toggle-group/toggle-group-control";
import {
  ColorControl,
  FontFamilyControl,
  FontWeightControl,
  SelectControl,
  TextControl,
} from "../../controls";
import { StyleSection } from "../../shared/style-section";
import {
  getPriorityStyleValueSource,
  PropertyLabel,
} from "../../property-label";
import { useComputedStyles } from "../../shared/model";
import { createBatchUpdate } from "../../shared/use-style-data";

const advancedProperties: CssProperty[] = [
  "white-space-collapse",
  "text-wrap-mode",
  "text-wrap-style",
  "direction",
  "hyphens",
  "text-overflow",
];

export const properties = [
  "font-family",
  "font-weight",
  "font-size",
  "line-height",
  "color",
  "text-align",
  "font-style",
  "text-decoration-line",
  "letter-spacing",
  "text-transform",
  ...advancedProperties,
] satisfies CssProperty[];

export const Section = () => {
  return (
    <StyleSection label="Typography" properties={properties}>
      <Flex gap="2" direction="column">
        <TypographySectionFont />
        <TypographySectionSizing />
        <TypographySectionAdvanced />
      </Flex>
    </StyleSection>
  );
};

const TypographySectionFont = () => {
  return (
    <Grid css={{ gridTemplateColumns: "4fr 6fr" }} gap={2}>
      <PropertyLabel
        label="Family"
        description={propertyDescriptions.fontFamily}
        properties={["font-family"]}
      />
      <FontFamilyControl />
      <PropertyLabel
        label="Weight"
        description={propertyDescriptions.fontWeight}
        properties={["font-weight"]}
      />
      <FontWeightControl />
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
          properties={["font-size"]}
        />
        <TextControl property="font-size" />
      </Grid>
      <Grid gap="1">
        <PropertyLabel
          label="Height"
          description={propertyDescriptions.lineHeight}
          properties={["line-height"]}
        />
        <TextControl property="line-height" />
      </Grid>
      <Grid gap="1">
        <PropertyLabel
          label="Spacing"
          description={propertyDescriptions.letterSpacing}
          properties={["letter-spacing"]}
        />
        <TextControl property="letter-spacing" />
      </Grid>
    </Grid>
  );
};

const TypographySectionAdvanced = () => {
  return (
    <Grid gap="2" columns="2">
      <ToggleGroupControl
        properties={["text-align"]}
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
        properties={["text-decoration-line"]}
        items={[
          {
            child: <XSmallIcon />,
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
        properties={["text-transform"]}
        items={[
          {
            child: <XSmallIcon />,
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
          properties={["font-style"]}
          items={[
            {
              child: <XSmallIcon />,
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
        <TypographySectionAdvancedPopover />
      </Grid>
    </Grid>
  );
};

const AdvancedOptionsButton = forwardRef<
  HTMLButtonElement,
  ComponentProps<typeof IconButton> & {
    /** https://www.radix-ui.com/docs/primitives/components/collapsible#trigger */
    "data-state"?: "open" | "closed";
  }
>(({ onClick, ...rest }, ref) => {
  const styles = useComputedStyles(advancedProperties);
  const styleValueSourceColor = getPriorityStyleValueSource(styles);
  return (
    <Flex>
      <EnhancedTooltip content="More typography options">
        <IconButton
          {...rest}
          onClick={(event) => {
            if (event.altKey) {
              const batch = createBatchUpdate();
              for (const property of advancedProperties) {
                batch.deleteProperty(property);
              }
              batch.publish();
              return;
            }
            onClick?.(event);
          }}
          variant={styleValueSourceColor}
          ref={ref}
        >
          <EllipsesIcon />
        </IconButton>
      </EnhancedTooltip>
    </Flex>
  );
});
AdvancedOptionsButton.displayName = "AdvancedOptionsButton";

const TypographySectionAdvancedPopover = () => {
  return (
    <FloatingPanel
      title="Advanced Typography"
      placement="bottom"
      content={
        <Grid
          css={{
            padding: theme.panel.padding,
            gap: theme.spacing[9],
            width: theme.spacing[30],
          }}
        >
          <Grid css={{ gridTemplateColumns: "5fr 5fr" }} gap={2}>
            <PropertyLabel
              label="White Space"
              description={propertyDescriptions.whiteSpaceCollapse}
              properties={["white-space-collapse"]}
            />
            <SelectControl property="white-space-collapse" />
            <PropertyLabel
              label="Wrap Mode"
              description={propertyDescriptions.textWrapMode}
              properties={["text-wrap-mode"]}
            />
            <SelectControl property="text-wrap-mode" />
            <PropertyLabel
              label="Wrap Style"
              description={propertyDescriptions.textWrapStyle}
              properties={["text-wrap-style"]}
            />
            <SelectControl property="text-wrap-style" />
            <PropertyLabel
              label="Direction"
              description={propertyDescriptions.direction}
              properties={["direction"]}
            />
            <Box css={{ justifySelf: "end" }}>
              <ToggleGroupControl
                properties={["direction"]}
                items={[
                  {
                    child: <ArrowRightIcon />,
                    description:
                      "Sets the text direction to left-to-right, which is the default for most languages.",
                    value: "ltr",
                  },
                  {
                    child: <ArrowLeftIcon />,
                    description:
                      "Sets the text direction to right-to-left, typically used for languages such as Arabic or Hebrew.",
                    value: "rtl",
                  },
                ]}
              />
            </Box>
            <PropertyLabel
              label="Hyphens"
              description={propertyDescriptions.hyphens}
              properties={["hyphens"]}
            />
            <Box css={{ justifySelf: "end" }}>
              <ToggleGroupControl
                properties={["hyphens"]}
                items={[
                  {
                    child: <XSmallIcon />,
                    description:
                      "Disables hyphenation of words. Words will not be hyphenated even if they exceed the width of their container.",
                    value: "manual",
                  },
                  {
                    child: <MinusIcon />,
                    description:
                      "Enables automatic hyphenation of words. The browser will hyphenate long words at appropriate points to fit within the width of their container.",
                    value: "auto",
                  },
                ]}
              />
            </Box>
            <PropertyLabel
              label="Text Overflow"
              description={propertyDescriptions.textOverflow}
              properties={["text-overflow"]}
            />
            <Box css={{ justifySelf: "end" }}>
              <ToggleGroupControl
                properties={["text-overflow"]}
                items={[
                  {
                    child: <XSmallIcon />,
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
            </Box>
          </Grid>
        </Grid>
      }
    >
      <AdvancedOptionsButton />
    </FloatingPanel>
  );
};
