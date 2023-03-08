/**
 * Will be fully rewritten in next iteration,
 * as of now just implement feature parity with old backgrounds section
 **/

import type { StyleValue } from "@webstudio-is/css-data";
import { theme, Flex, Grid, Label } from "@webstudio-is/design-system";
import { ImageControl, TextControl } from "../../controls";
import type { StyleInfo } from "../../shared/style-info";
import type {
  DeleteProperty,
  SetProperty,
  StyleUpdateOptions,
} from "../../shared/use-style-data";

import {
  DeleteBackgroundProperty,
  isBackgroundLayeredProperty,
  isBackgroundStyleValue,
  type SetBackgroundProperty,
} from "./background-layers";

import { FloatingPanelProvider } from "~/builder/shared/floating-panel";
import { useRef } from "react";

type BackgroundContentProps = {
  currentStyle: StyleInfo;
  setProperty: SetBackgroundProperty;
  deleteProperty: DeleteBackgroundProperty;
};

const safeDeleteProperty = (
  deleteProperty: DeleteBackgroundProperty
): DeleteProperty => {
  return (property, options) => {
    const isLayered = isBackgroundLayeredProperty(property);
    if (isLayered) {
      return deleteProperty(property, options);
    }
    throw new Error(`Property ${property} should be background style property`);
  };
};

const safeSetProperty = (setBackgroundProperty: SetBackgroundProperty) => {
  const result: SetProperty = (property) => {
    // isBackgroundLayeredProperty is typeguard and ts don't understand === false
    if (!isBackgroundLayeredProperty(property)) {
      throw new Error(
        `Property ${property} should be background style property`
      );
    }
    return (style: string | StyleValue, options?: StyleUpdateOptions) => {
      if (typeof style === "string") {
        throw new Error("style should be StyleValue and not a string");
      }

      // isBackgroundStyleValue is typeguard and ts don't understand === false
      if (!isBackgroundStyleValue(style)) {
        throw new Error("Style should be valid BackgroundStyleValue");
      }

      return setBackgroundProperty(property)(style, options);
    };
  };
  return result;
};

/*
@todo remove comment after section done

Stackable: !default!


background-image: url, linear-gradient, radial-gradient, repeating-linear-gradient, repeating-radial-gradient etc

background-clip: !border-box!, padding-box, content-box, text
background-origin: border-box, !padding-box!, content-box
background-size: cover, contain, !auto!, x[unit] y[unit]

background-position-x: !0%!, left, center, right, x[unit]
background-position-y: !0%!, top, center, bottom, y[unit]

background-repeat-x,
background-repeat-y: !repeat!, space, round, no-repeat

background-attachment: !scroll!, fixed, local

background-blend-mode: !normal!, multiply, screen, overlay, darken, lighten, color-dodge, color-burn, hard-light, soft-light, difference, exclusion, hue, saturation, color, luminosity

Not stackable:

background-color
*/

export const BackgroundContent = (props: BackgroundContentProps) => {
  const setProperty = safeSetProperty(props.setProperty);
  const deleteProperty = safeDeleteProperty(props.deleteProperty);

  const elementRef = useRef<HTMLDivElement>(null);

  return (
    <Flex
      css={{ p: theme.spacing[9] }}
      direction="column"
      gap={2}
      ref={elementRef}
    >
      <Grid css={{ gridTemplateColumns: "4fr 6fr" }} align="center" gap={2}>
        <Label color="default" truncate>
          Image
        </Label>
        <FloatingPanelProvider container={elementRef}>
          <ImageControl
            setProperty={setProperty}
            deleteProperty={deleteProperty}
            currentStyle={props.currentStyle}
            property="backgroundImage"
          />
        </FloatingPanelProvider>

        <Label color="default" truncate>
          Clip
        </Label>

        <TextControl
          setProperty={setProperty}
          deleteProperty={deleteProperty}
          currentStyle={props.currentStyle}
          property="backgroundClip"
        />

        <Label color="default" truncate>
          Origin
        </Label>

        <TextControl
          setProperty={setProperty}
          deleteProperty={deleteProperty}
          currentStyle={props.currentStyle}
          property="backgroundOrigin"
        />

        <Label color="default" truncate>
          Size
        </Label>

        <TextControl
          setProperty={setProperty}
          deleteProperty={deleteProperty}
          currentStyle={props.currentStyle}
          property="backgroundSize"
        />

        <Label color="default" truncate>
          Position X
        </Label>

        <TextControl
          setProperty={setProperty}
          deleteProperty={deleteProperty}
          currentStyle={props.currentStyle}
          property="backgroundPositionX"
        />

        <Label color="default" truncate>
          Position Y
        </Label>

        <TextControl
          setProperty={setProperty}
          deleteProperty={deleteProperty}
          currentStyle={props.currentStyle}
          property="backgroundPositionY"
        />

        <Label color="default" truncate>
          Repeat
        </Label>

        <TextControl
          setProperty={setProperty}
          deleteProperty={deleteProperty}
          currentStyle={props.currentStyle}
          property="backgroundRepeat"
        />

        <Label color="default" truncate>
          Attachment
        </Label>
        <TextControl
          setProperty={setProperty}
          deleteProperty={deleteProperty}
          currentStyle={props.currentStyle}
          property="backgroundAttachment"
        />

        <Label color="default" truncate>
          Blend mode
        </Label>
        <TextControl
          setProperty={setProperty}
          deleteProperty={deleteProperty}
          currentStyle={props.currentStyle}
          property="backgroundBlendMode"
        />
      </Grid>
    </Flex>
  );
};
