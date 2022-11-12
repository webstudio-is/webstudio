import type { RenderCategoryProps } from "../../style-sections";
import { Grid, IconButton } from "@webstudio-is/design-system";
import { PropertyName } from "../../shared/property-name";
import {
  ColorControl,
  FontFamilyControl,
  SelectControl,
  TextControl,
} from "../../controls";
import { CrossSmallIcon, EllipsesIcon } from "@webstudio-is/icons";
import { ToggleGroupControl } from "../../controls/toggle/toggle-control";
import { ValuePickerPopover } from "../../shared/value-picker-popover";

export const TypographySection = ({
  setProperty,
  currentStyle,
  sectionStyle,
}: RenderCategoryProps) => {
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
  const setTextAlign = setProperty("textAlign");
  const setTextDecorationLine = setProperty("textDecorationLine");
  const setTextTransform = setProperty("textTransform");
  const setFontStyle = setProperty("fontStyle");
  const setDirection = setProperty("direction");
  const setTextOverflow = setProperty("textOverflow");
  const setHyphens = setProperty("hyphens");

  return (
    <>
      <Grid gap="2">
        <Grid css={{ gridTemplateColumns: "4fr 6fr" }}>
          <PropertyName
            label="Font"
            property={sectionStyle.fontFamily?.styleConfig.property}
          />
          <FontFamilyControl {...sectionStyle.fontFamily} />
        </Grid>
        <Grid css={{ gridTemplateColumns: "4fr 6fr" }}>
          <PropertyName
            label="Weight"
            property={sectionStyle.fontWeight?.styleConfig.property}
          />
          <SelectControl {...sectionStyle.fontWeight} />
        </Grid>
        <Grid css={{ gridTemplateColumns: "4fr 6fr" }}>
          <PropertyName
            label="Color"
            property={sectionStyle.color?.styleConfig.property}
          />
          <ColorControl {...sectionStyle.color} />
        </Grid>
      </Grid>

      <Grid
        css={{
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "$3",
        }}
      >
        <Grid css={{ gridTemplateColumns: "auto", gap: "$1" }}>
          <PropertyName
            property={sectionStyle.fontSize?.styleConfig.property}
            label="Size"
          />
          <TextControl {...sectionStyle.fontSize} />
        </Grid>
        <Grid css={{ gridTemplateColumns: "auto", gap: "$1" }}>
          <PropertyName
            property={sectionStyle.lineHeight?.styleConfig.property}
            label="Height"
          />
          <TextControl {...sectionStyle.lineHeight} />
        </Grid>
        <Grid css={{ gridTemplateColumns: "auto", gap: "$1" }}>
          <PropertyName
            property={sectionStyle.letterSpacing?.styleConfig.property}
            label="Spacing"
          />
          <TextControl {...sectionStyle.letterSpacing} />
        </Grid>
      </Grid>

      <Grid gap="2">
        <Grid
          css={{
            gridTemplateColumns: "1fr 1fr",
            gap: "$3",
          }}
        >
          <ToggleGroupControl
            property={sectionStyle.textAlign?.styleConfig.property}
            onValueChange={(value) => setTextAlign(value)}
            value={String(getTextAlign(String(currentStyle.textAlign?.value)))}
            items={[
              {
                child: <CrossSmallIcon />,
                label: "align: left",
                value: "start",
              },
              {
                child: <CrossSmallIcon />,
                label: "align: center",
                value: "center",
              },
              {
                child: <CrossSmallIcon />,
                label: "align: right",
                value: "end",
              },
              {
                child: <CrossSmallIcon />,
                label: "align: justify",
                value: "justify",
              },
            ]}
          />
          <ToggleGroupControl
            property={sectionStyle.textDecorationLine?.styleConfig.property}
            onValueChange={(value) => setTextDecorationLine(value)}
            value={String(currentStyle.textDecorationLine?.value)}
            items={[
              {
                child: <CrossSmallIcon />,
                label: "None",
                value: "none",
              },
              {
                child: <CrossSmallIcon />,
                label: "Underline",
                value: "underline",
              },
              {
                child: <CrossSmallIcon />,
                label: "Line through",
                value: "line-through",
              },
            ]}
          />
        </Grid>
        <Grid
          css={{
            gridTemplateColumns: "1fr 1fr auto",
            gap: "$3",
            alignItems: "center",
          }}
        >
          <ToggleGroupControl
            property={sectionStyle.textTransform?.styleConfig.property}
            onValueChange={(value) => setTextTransform(value)}
            value={String(currentStyle.textTransform?.value)}
            items={[
              {
                child: <CrossSmallIcon />,
                label: "None",
                value: "none",
              },
              {
                child: <CrossSmallIcon />,
                label: "Uppercase",
                value: "uppercase",
              },
              {
                child: <CrossSmallIcon />,
                label: "Capitalize",
                value: "capitalize",
              },
              {
                child: <CrossSmallIcon />,
                label: "Lowercase",
                value: "lowercase",
              },
            ]}
          />
          <ToggleGroupControl
            property={sectionStyle.fontStyle?.styleConfig.property}
            onValueChange={(value) => setFontStyle(value)}
            value={String(currentStyle.fontStyle?.value)}
            items={[
              {
                child: <CrossSmallIcon />,
                label: "None",
                value: "normal",
              },
              {
                child: <CrossSmallIcon />,
                label: "Italic",
                value: "italic",
              },
            ]}
          />
          <ValuePickerPopover
            title="Advanced Typography"
            content={
              <Grid css={{ padding: "$3", gap: "$3" }}>
                <Grid css={{ gridTemplateColumns: "4fr 6fr" }}>
                  <PropertyName
                    property={sectionStyle.whiteSpace?.styleConfig.property}
                    label="White Space"
                  />
                  <SelectControl {...sectionStyle.whiteSpace} />
                </Grid>
                <Grid css={{ gridTemplateColumns: "4fr auto" }}>
                  <PropertyName
                    property={sectionStyle.whiteSpace?.styleConfig.property}
                    label="Direction"
                  />
                  <ToggleGroupControl
                    property={sectionStyle.direction?.styleConfig.property}
                    onValueChange={(value) => setDirection(value)}
                    value={String(currentStyle.direction?.value)}
                    items={[
                      {
                        child: <CrossSmallIcon />,
                        label: "Left to Right",
                        value: "ltr",
                      },
                      {
                        child: <CrossSmallIcon />,
                        label: "Right to Left",
                        value: "rtl",
                      },
                    ]}
                  />
                </Grid>
                <Grid css={{ gridTemplateColumns: "4fr auto" }}>
                  <PropertyName
                    property={sectionStyle.hyphens?.styleConfig.property}
                    label="Hyphens"
                  />
                  <ToggleGroupControl
                    property={sectionStyle.hyphens?.styleConfig.property}
                    onValueChange={(value) => setHyphens(value)}
                    value={String(currentStyle.hyphens?.value)}
                    items={[
                      {
                        child: <CrossSmallIcon />,
                        label: "None",
                        value: "manual",
                      },
                      {
                        child: <CrossSmallIcon />,
                        label: "Auto",
                        value: "auto",
                      },
                    ]}
                  />
                </Grid>
                <Grid css={{ gridTemplateColumns: "4fr auto" }}>
                  <PropertyName
                    property={sectionStyle.textOverflow?.styleConfig.property}
                    label="Text Overflow"
                  />
                  <ToggleGroupControl
                    property={sectionStyle.textOverflow?.styleConfig.property}
                    onValueChange={(value) => setTextOverflow(value)}
                    value={String(currentStyle.textOverflow?.value)}
                    items={[
                      {
                        child: <CrossSmallIcon />,
                        label: "None",
                        value: "clip",
                      },
                      {
                        child: <CrossSmallIcon />,
                        label: "Ellipsis",
                        value: "ellipsis",
                      },
                    ]}
                  />
                </Grid>
              </Grid>
            }
          >
            <IconButton>
              <EllipsesIcon />
            </IconButton>
          </ValuePickerPopover>
        </Grid>
      </Grid>
    </>
  );
};
