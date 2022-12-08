import type { RenderCategoryProps } from "../../style-sections";
import {
  Flex,
  Grid,
  IconButton_deprecated,
  Tooltip,
} from "@webstudio-is/design-system";
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
import { ValuePickerPopover } from "../../shared/value-picker-popover";

export const TypographySection = (props: RenderCategoryProps) => {
  return (
    <Flex css={{ gap: "$spacing$7" }} direction="column">
      <TypographySectionFont {...props} />
      <TypographySectionSizing {...props} />
      <TypographySectionAdvanced {...props} />
    </Flex>
  );
};

export const TypographySectionFont = (props: RenderCategoryProps) => {
  const { sectionStyle } = props;

  return (
    <Grid
      css={{
        gap: "$spacing$5",
      }}
    >
      <Grid css={{ gridTemplateColumns: "4fr 6fr" }}>
        <PropertyName label="Font" property="fontFamily" />
        <FontFamilyControl {...sectionStyle.fontFamily} />
      </Grid>
      <Grid css={{ gridTemplateColumns: "4fr 6fr" }}>
        <PropertyName label="Weight" property="fontWeight" />
        <FontWeightControl {...sectionStyle.fontWeight} />
      </Grid>
      <Grid css={{ gridTemplateColumns: "4fr 6fr" }}>
        <PropertyName label="Color" property="color" />
        <ColorControl {...sectionStyle.color} />
      </Grid>
    </Grid>
  );
};

export const TypographySectionSizing = (props: RenderCategoryProps) => {
  const { sectionStyle } = props;

  return (
    <Grid
      css={{
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: "$spacing$5",
      }}
    >
      <Grid css={{ gridTemplateColumns: "auto", gap: "$spacing$3" }}>
        <PropertyName property="fontSize" label="Size" />
        <TextControl {...sectionStyle.fontSize} />
      </Grid>
      <Grid css={{ gridTemplateColumns: "auto", gap: "$spacing$3" }}>
        <PropertyName property="lineHeight" label="Height" />
        <TextControl {...sectionStyle.lineHeight} />
      </Grid>
      <Grid css={{ gridTemplateColumns: "auto", gap: "$spacing$3" }}>
        <PropertyName property="letterSpacing" label="Spacing" />
        <TextControl {...sectionStyle.letterSpacing} />
      </Grid>
    </Grid>
  );
};

export const TypographySectionAdvanced = (props: RenderCategoryProps) => {
  const { setProperty, currentStyle } = props;
  const setTextAlign = setProperty("textAlign");
  const setTextDecorationLine = setProperty("textDecorationLine");
  const setTextTransform = setProperty("textTransform");
  const setFontStyle = setProperty("fontStyle");

  return (
    <Grid
      css={{
        gap: "$spacing$5",
      }}
    >
      <Grid
        css={{
          gridTemplateColumns: "1fr 1fr",
          gap: "$spacing$9",
        }}
      >
        <ToggleGroupControl
          property="textAlign"
          onValueChange={(value) => setTextAlign(value)}
          value={String(getTextAlign(String(currentStyle.textAlign?.value)))}
          items={[
            {
              child: <TextAlignLeftIcon />,
              label: "align: left",
              value: "start",
            },
            {
              child: <TextAlignCenterIcon />,
              label: "align: center",
              value: "center",
            },
            {
              child: <TextAlignRightIcon />,
              label: "align: right",
              value: "end",
            },
            {
              child: <TextAlignJustifyIcon />,
              label: "align: justify",
              value: "justify",
            },
          ]}
        />
        <ToggleGroupControl
          property="textDecorationLine"
          onValueChange={(value) => setTextDecorationLine(value)}
          value={String(currentStyle.textDecorationLine?.value)}
          items={[
            {
              child: <CrossSmallIcon />,
              label: "None",
              value: "none",
            },
            {
              child: <TextUnderlineIcon />,
              label: "Underline",
              value: "underline",
            },
            {
              child: <TextStrikethroughIcon />,
              label: "Line through",
              value: "line-through",
            },
          ]}
        />
      </Grid>
      <Grid
        css={{
          gridTemplateColumns: "1fr 1fr auto",
          gap: "$spacing$9",
          alignItems: "center",
        }}
      >
        <ToggleGroupControl
          property="textTransform"
          onValueChange={(value) => setTextTransform(value)}
          value={String(currentStyle.textTransform?.value)}
          items={[
            {
              child: <CrossSmallIcon />,
              label: "None",
              value: "none",
            },
            {
              child: <TextUppercaseIcon />,
              label: "Uppercase",
              value: "uppercase",
            },
            {
              child: <TextCapitalizeIcon />,
              label: "Capitalize",
              value: "capitalize",
            },
            {
              child: <TextLowercaseIcon />,
              label: "Lowercase",
              value: "lowercase",
            },
          ]}
        />
        <ToggleGroupControl
          property="fontStyle"
          onValueChange={(value) => setFontStyle(value)}
          value={String(currentStyle.fontStyle?.value)}
          items={[
            {
              child: <CrossSmallIcon />,
              label: "None",
              value: "normal",
            },
            {
              child: <TextItalicIcon />,
              label: "Italic",
              value: "italic",
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
  const { setProperty, currentStyle, sectionStyle } = props;
  const setDirection = setProperty("direction");
  const setTextOverflow = setProperty("textOverflow");
  const setHyphens = setProperty("hyphens");
  return (
    <ValuePickerPopover
      title="Advanced Typography"
      content={
        <Grid css={{ padding: "$spacing$9", gap: "$spacing$9" }}>
          <Grid css={{ gridTemplateColumns: "4fr 6fr" }}>
            <PropertyName property="whiteSpace" label="White Space" />
            <SelectControl {...sectionStyle.whiteSpace} />
          </Grid>
          <Grid css={{ gridTemplateColumns: "4fr auto" }}>
            <PropertyName property="direction" label="Direction" />
            <ToggleGroupControl
              property="direction"
              onValueChange={(value) => setDirection(value)}
              value={String(currentStyle.direction?.value)}
              items={[
                {
                  child: <TextDirectionLTRIcon />,
                  label: "Left to Right",
                  value: "ltr",
                },
                {
                  child: <TextDirectionRTLIcon />,
                  label: "Right to Left",
                  value: "rtl",
                },
              ]}
            />
          </Grid>
          <Grid css={{ gridTemplateColumns: "4fr auto" }}>
            <PropertyName property="hyphens" label="Hyphens" />
            <ToggleGroupControl
              property="hyphens"
              onValueChange={(value) => setHyphens(value)}
              value={String(currentStyle.hyphens?.value)}
              items={[
                {
                  child: <CrossSmallIcon />,
                  label: "None",
                  value: "manual",
                },
                {
                  child: <TextHyphenIcon />,
                  label: "Auto",
                  value: "auto",
                },
              ]}
            />
          </Grid>
          <Grid css={{ gridTemplateColumns: "4fr auto" }}>
            <PropertyName property="textOverflow" label="Text Overflow" />
            <ToggleGroupControl
              property="textOverflow"
              onValueChange={(value) => setTextOverflow(value)}
              value={String(currentStyle.textOverflow?.value)}
              items={[
                {
                  child: <CrossSmallIcon />,
                  label: "None",
                  value: "clip",
                },
                {
                  child: <TextTruncateIcon />,
                  label: "Ellipsis",
                  value: "ellipsis",
                },
              ]}
            />
          </Grid>
        </Grid>
      }
    >
      <Flex>
        <Tooltip content="More typography options" delayDuration={0}>
          <IconButton_deprecated>
            <EllipsesIcon />
          </IconButton_deprecated>
        </Tooltip>
      </Flex>
    </ValuePickerPopover>
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
