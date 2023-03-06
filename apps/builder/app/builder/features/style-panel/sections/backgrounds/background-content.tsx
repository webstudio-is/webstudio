import type { StyleValue } from "@webstudio-is/css-data";
import { theme, Flex, Grid, Label } from "@webstudio-is/design-system";
import { ImageControl } from "../../controls";
import type { StyleInfo } from "../../shared/style-info";
import type {
  SetProperty,
  StyleUpdateOptions,
} from "../../shared/use-style-data";

import {
  isBackgroundLayeredProperty,
  isBackgroundStyleValue,
  layeredBackgroundPropsDefaults,
  type SetBackgroundProperty,
} from "./background-layers";

import { FloatingPanelProvider } from "~/builder/shared/floating-panel";
import { useRef } from "react";

type BackgroundContentProps = {
  currentStyle: StyleInfo;
  setProperty: SetBackgroundProperty;
};

const safeSetProperty = (setBackgroundProperty: SetBackgroundProperty) => {
  const result: SetProperty = (property) => {
    // isBackgroundLayeredProperty is typeguard and ts don't understand === false
    if (!isBackgroundLayeredProperty(property)) {
      throw new Error("");
    }
    return (style: string | StyleValue, options?: StyleUpdateOptions) => {
      if (typeof style === "string") {
        throw new Error("style should be StyleValue and not a string");
      }

      // isBackgroundStyleValue is typeguard and ts don't understand === false
      if (!isBackgroundStyleValue(style)) {
        throw new Error("Style should be valid BackgroundStyleValue");
      }

      return setBackgroundProperty(property)(style);
    };
  };
  return result;
};

export const BackgroundContent = (props: BackgroundContentProps) => {
  const setProperty = safeSetProperty(props.setProperty);
  const eltRef = useRef<HTMLDivElement>(null);

  return (
    <Flex css={{ p: theme.spacing[9] }} direction="column" gap={2} ref={eltRef}>
      <Grid css={{ gridTemplateColumns: "4fr 6fr" }}>
        <Label color="default" truncate>
          Background Image
        </Label>
        <FloatingPanelProvider container={eltRef}>
          <ImageControl
            setProperty={setProperty}
            deleteProperty={() => {
              props.setProperty("backgroundImage")(
                layeredBackgroundPropsDefaults["backgroundImage"]
              );
            }}
            currentStyle={props.currentStyle}
            property="backgroundImage"
          />
        </FloatingPanelProvider>
      </Grid>
    </Flex>
  );
};
