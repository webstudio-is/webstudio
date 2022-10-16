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

export const TypographySection = ({
  setProperty,
  currentStyle,
  sectionStyle,
}: RenderCategoryProps) => {
  const setTextAlign = setProperty("textAlign");
  const setTextDecorationLine = setProperty("textDecorationLine");
  const setTextTransform = setProperty("textTransform");
  const setFontStyle = setProperty("fontStyle");

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
            value={String(currentStyle.alignSelf?.value)}
            items={[
              {
                child: <CrossSmallIcon />,
                label: "align: left",
                value: "left",
              },
              {
                child: <CrossSmallIcon />,
                label: "align: center",
                value: "center",
              },
              {
                child: <CrossSmallIcon />,
                label: "align: right",
                value: "right",
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
          <IconButton>
            <EllipsesIcon />
          </IconButton>
        </Grid>
      </Grid>
    </>
  );
};
