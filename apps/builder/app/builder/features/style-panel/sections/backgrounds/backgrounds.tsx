import type { RenderCategoryProps } from "../../style-sections";
import { styleConfigByName } from "../../shared/configs";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import {
  CssValueListItem,
  Flex,
  Grid,
  SmallIconButton,
  styled,
  theme,
} from "@webstudio-is/design-system";
import { SmallToggleButton } from "@webstudio-is/design-system";
import {
  EyeconOpenIcon,
  EyeconClosedIcon,
  SubtractIcon,
} from "@webstudio-is/icons";
import { useState } from "react";
import { PropertyName } from "../../shared/property-name";
import type { StyleInfo } from "../../shared/style-info";
import type { DeleteProperty } from "../../shared/use-style-data";
import { ColorControl } from "../../controls/color/color-control";

/*
Stackable: !default!

background-attachment: !scroll!, fixed, local

background-clip: !border-box!, padding-box, content-box, text

background-blend-mode: !normal!, multiply, screen, overlay, darken, lighten, color-dodge, color-burn, hard-light, soft-light, difference, exclusion, hue, saturation, color, luminosity

background-image: url, linear-gradient, radial-gradient, repeating-linear-gradient, repeating-radial-gradient etc

background-origin: border-box, !padding-box!, content-box

background-position-x: !0%!, left, center, right, x[unit]
background-position-y: !0%!, top, center, bottom, y[unit]

background-repeat-x,
background-repeat-y: !repeat!, space, round, no-repeat

background-size: cover, contain, !auto!, x[unit] y[unit]

Not stackable:

background-color
*/

// const setLayeredProperty = (property: string, layerIndex) => (value: string) => {}

// Transform existing style to layered style

const layeredBackgroundPropsDefaults = {
  backgroundAttachment: "scroll",
  backgroundClip: "border-box",
  backgroundBlendMode: "normal",
  backgroundImage: "none",
  backgroundOrigin: "padding-box",
  backgroundPositionX: "0%",
  backgroundPositionY: "0%",
  backgroundRepeat: "repeat",
  backgroundSize: "auto",
} as const;

const layeredBackgroundProps = Object.keys(
  layeredBackgroundPropsDefaults
) as (keyof typeof layeredBackgroundPropsDefaults)[];

const Thumbnail = styled("div", {
  width: theme.spacing[10],
  height: theme.spacing[10],
  backgroundImage: "linear-gradient(yellow, red)",
});

const Layer = (props: {
  currentStyle: StyleInfo;
  deleteProperty: DeleteProperty;
}) => {
  const [hidden, setHidden] = useState(false);

  return (
    <FloatingPanel title="Images" content={<div>HELLO</div>}>
      <CssValueListItem
        label={
          <PropertyName
            style={props.currentStyle}
            property={layeredBackgroundProps}
            label="Image"
            onReset={() => {
              for (const property of layeredBackgroundProps) {
                props.deleteProperty(property);
              }
            }}
          />
        }
        thumbnail={<Thumbnail />}
        hidden={hidden}
        buttons={
          <>
            <SmallToggleButton
              pressed={hidden}
              onPressedChange={setHidden}
              variant="normal"
              tabIndex={0}
              icon={hidden ? <EyeconClosedIcon /> : <EyeconOpenIcon />}
            />

            <SmallIconButton
              variant="destructive"
              tabIndex={0}
              icon={<SubtractIcon />}
            />
          </>
        }
      />
    </FloatingPanel>
  );
};

export const BackgroundsSection = ({
  setProperty,
  deleteProperty,
  currentStyle,
  styleConfigsByCategory,
  moreStyleConfigsByCategory,
}: RenderCategoryProps) => {
  /*
  console.log({
    backgroundImage: currentStyle.backgroundImage,
    backgroundPosition: currentStyle.backgroundPositionX,
  });
  */

  const { items } = styleConfigByName["backgroundColor"];

  return (
    <Flex gap={1} direction="column">
      <Layer currentStyle={currentStyle} deleteProperty={deleteProperty} />

      <Flex css={{ px: theme.spacing[9] }}>
        <Grid css={{ gridTemplateColumns: "4fr 6fr" }}>
          <PropertyName
            style={currentStyle}
            property={"backgroundColor"}
            label={"Color"}
            onReset={() => deleteProperty("backgroundColor")}
          />

          <ColorControl
            property={"backgroundColor"}
            items={items}
            currentStyle={currentStyle}
            setProperty={setProperty}
            deleteProperty={deleteProperty}
          />
        </Grid>
      </Flex>
    </Flex>
  );
};
