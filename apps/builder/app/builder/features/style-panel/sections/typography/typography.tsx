import type { RenderCategoryProps } from "../../style-sections";
import {
  Flex,
  Grid,
  DeprecatedIconButton,
  Tooltip,
} from "@webstudio-is/design-system";
import { toValue } from "@webstudio-is/css-engine";
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
import { theme } from "@webstudio-is/design-system";
import { CollapsibleSection } from "~/builder/shared/collapsible-section";

export const TypographySection = (props: RenderCategoryProps) => {
  return (
    <CollapsibleSection label={props.label} isOpen={props.isOpen}>
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
      <Grid css={{ gridTemplateColumns: "4fr 6fr" }}>
        <PropertyName
          style={currentStyle}
          label="Font"
          property="fontFamily"
          onReset={() => deleteProperty("fontFamily")}
        />
        <FontFamilyControl
          property="fontFamily"
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />
      </Grid>
      <Grid css={{ gridTemplateColumns: "4fr 6fr" }}>
        <PropertyName
          style={currentStyle}
          label="Weight"
          property="fontWeight"
          onReset={() => deleteProperty("fontWeight")}
        />
        <FontWeightControl
          property="fontWeight"
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />
      </Grid>
      <Grid css={{ gridTemplateColumns: "4fr 6fr" }}>
        <PropertyName
          style={currentStyle}
          label="Color"
          property="color"
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
          property="fontSize"
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
          property="lineHeight"
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
          property="letterSpacing"
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
  const { setProperty, currentStyle } = props;
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
          styleSource={getStyleSource(currentStyle.textAlign)}
          onValueChange={(value) => setTextAlign(value)}
          value={String(getTextAlign(toValue(currentStyle.textAlign?.value)))}
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
          styleSource={getStyleSource(currentStyle.textDecorationLine)}
          onValueChange={(value) => setTextDecorationLine(value)}
          value={toValue(currentStyle.textDecorationLine?.value)}
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
          gap: theme.spacing[9],
          alignItems: "center",
        }}
      >
        <ToggleGroupControl
          styleSource={getStyleSource(currentStyle.textTransform)}
          onValueChange={(value) => setTextTransform(value)}
          value={toValue(currentStyle.textTransform?.value)}
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
          styleSource={getStyleSource(currentStyle.fontStyle)}
          onValueChange={(value) => setFontStyle(value)}
          value={toValue(currentStyle.fontStyle?.value)}
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
  const { deleteProperty, setProperty, currentStyle } = props;
  const setDirection = setProperty("direction");
  const setTextOverflow = setProperty("textOverflow");
  const setHyphens = setProperty("hyphens");
  return (
    <FloatingPanel
      title="Advanced Typography"
      content={
        <Grid css={{ padding: theme.spacing[9], gap: theme.spacing[9] }}>
          <Grid css={{ gridTemplateColumns: "4fr 6fr" }}>
            <PropertyName
              style={currentStyle}
              property="whiteSpace"
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
              property="direction"
              label="Direction"
              onReset={() => deleteProperty("direction")}
            />
            <ToggleGroupControl
              styleSource={getStyleSource(currentStyle.direction)}
              onValueChange={(value) => setDirection(value)}
              value={toValue(currentStyle.direction?.value)}
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
            <PropertyName
              style={currentStyle}
              property="hyphens"
              label="Hyphens"
              onReset={() => deleteProperty("hyphens")}
            />
            <ToggleGroupControl
              styleSource={getStyleSource(currentStyle.hyphens)}
              onValueChange={(value) => setHyphens(value)}
              value={toValue(currentStyle.hyphens?.value)}
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
            <PropertyName
              style={currentStyle}
              property="textOverflow"
              label="Text Overflow"
              onReset={() => deleteProperty("textOverflow")}
            />
            <ToggleGroupControl
              styleSource={getStyleSource(currentStyle.textOverflow)}
              onValueChange={(value) => setTextOverflow(value)}
              value={toValue(currentStyle.textOverflow?.value)}
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
