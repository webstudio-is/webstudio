/**
 * Will be fully rewritten in next iteration,
 * as of now just implement feature parity with old backgrounds section
 **/

import { useRef, useState } from "react";
import { propertyDescriptions } from "@webstudio-is/css-data";
import type { StyleValue } from "@webstudio-is/css-engine";
import {
  RepeatGridIcon,
  RepeatColumnIcon,
  RepeatRowIcon,
  CrossSmallIcon,
} from "@webstudio-is/icons";
import { toValue } from "@webstudio-is/css-engine";
import {
  theme,
  Flex,
  Grid,
  ToggleGroup,
  ToggleGroupButton,
  Separator,
  styled,
} from "@webstudio-is/design-system";
import { ImageControl, SelectControl } from "../../controls";
import type { StyleInfo } from "../../shared/style-info";
import type {
  DeleteProperty,
  SetProperty,
  StyleUpdateOptions,
} from "../../shared/use-style-data";
import {
  type DeleteBackgroundProperty,
  isBackgroundLayeredProperty,
  isBackgroundStyleValue,
  type SetBackgroundProperty,
} from "./background-layers";
import { FloatingPanelProvider } from "~/builder/shared/floating-panel";
import { BackgroundSize } from "./background-size";
import { BackgroundGradient } from "./background-gradient";
import { BackgroundImage } from "./background-image";
import { BackgroundPosition } from "./background-position";
import { PropertyInlineLabel } from "../../property-label";
import { ToggleGroupTooltip } from "../../controls/toggle-group/toggle-group-control";

type BackgroundContentProps = {
  index: number;
  currentStyle: StyleInfo;
  setProperty: SetBackgroundProperty;
  deleteProperty: DeleteBackgroundProperty;
  setBackgroundColor: (color: StyleValue) => void;
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
    if (isBackgroundLayeredProperty(property)) {
      return (style: string | StyleValue, options?: StyleUpdateOptions) => {
        if (typeof style === "string") {
          throw new Error("style should be StyleValue and not a string");
        }

        if (isBackgroundStyleValue(style)) {
          return setBackgroundProperty(property)(style, options);
        }

        throw new Error("Style should be valid BackgroundStyleValue");
      };
    }

    throw new Error(`Property ${property} should be background style property`);
  };

  return result;
};

const detectImageOrGradientToggle = (currentStyle: StyleInfo) => {
  if (currentStyle?.backgroundImage?.value.type === "image") {
    return "image";
  }

  if (currentStyle?.backgroundImage?.value.type === "keyword") {
    // The only allowed keyword for backgroundImage is none
    return "image";
  }

  return "gradient";
};

const isImageOrGradient = (value: string): value is "image" | "gradient" => {
  return value === "image" || value === "gradient";
};

const BackgroundSection = styled("div", {
  mx: theme.spacing[9],
  my: theme.spacing[6],
});

const Spacer = styled("div", {
  height: theme.spacing[5],
});

const BackgroundRepeat = (props: BackgroundContentProps) => {
  const { currentStyle, setProperty } = props;
  const items = [
    {
      child: <CrossSmallIcon />,
      description:
        "This value indicates that the background image will not be repeated and will appear only once.",
      value: "no-repeat",
    },
    {
      child: <RepeatGridIcon />,
      description:
        "This value indicates that the background image will be repeated both horizontally and vertically to fill the entire background area.",
      value: "repeat",
    },
    {
      child: <RepeatColumnIcon />,
      description:
        "This value indicates that the background image will be repeated only vertically.",
      value: "repeat-y",
    },
    {
      child: <RepeatRowIcon />,
      description:
        "This value indicates that the background image will be repeated only horizontally.",
      value: "repeat-x",
    },
  ];
  // Issue: The tooltip's grace area is too big and overlaps with nearby buttons,
  // preventing the tooltip from changing when the buttons are hovered over in certain cases.
  // To solve issue and allow tooltips to change on button hover,
  // we close the button tooltip in the ToggleGroupButton.onMouseEnter handler.
  // onMouseEnter used to preserve default hovering behavior on tooltip.
  const [activeTooltip, setActiveTooltip] = useState<undefined | string>();
  return (
    <>
      <PropertyInlineLabel
        label="Repeat"
        description={propertyDescriptions.backgroundRepeat}
        properties={["backgroundRepeat"]}
      />

      <Flex css={{ justifySelf: "end" }}>
        <ToggleGroup
          type="single"
          value={toValue(currentStyle.backgroundRepeat?.value)}
          onValueChange={(value) => {
            setProperty("backgroundRepeat")({
              type: "keyword",
              value,
            });
          }}
        >
          {items.map((item) => (
            <ToggleGroupTooltip
              key={item.value}
              isOpen={item.value === activeTooltip}
              onOpenChange={(isOpen) =>
                setActiveTooltip(isOpen ? item.value : undefined)
              }
              isSelected={false}
              label="Background Repeat"
              code={`background-repeat: ${item.value};`}
              description={item.description}
              properties={["backgroundRepeat"]}
            >
              <ToggleGroupButton
                value={item.value}
                onMouseEnter={() =>
                  // reset only when highlighted is not active
                  setActiveTooltip((prevValue) =>
                    prevValue === item.value ? prevValue : undefined
                  )
                }
              >
                {item.child}
              </ToggleGroupButton>
            </ToggleGroupTooltip>
          ))}
        </ToggleGroup>
      </Flex>
    </>
  );
};

export const BackgroundContent = (props: BackgroundContentProps) => {
  const setProperty = safeSetProperty(props.setProperty);
  const deleteProperty = safeDeleteProperty(props.deleteProperty);
  const { currentStyle, index } = props;

  const elementRef = useRef<HTMLDivElement>(null);
  const [imageGradientToggle, setImageGradientToggle] = useState<
    "image" | "gradient"
  >(() => detectImageOrGradientToggle(currentStyle));

  return (
    <>
      <BackgroundSection ref={elementRef}>
        <Flex justify="center">
          <ToggleGroup
            type="single"
            value={imageGradientToggle}
            onValueChange={(value) => {
              if (isImageOrGradient(value)) {
                setImageGradientToggle(value);
              }
            }}
          >
            {/* looks like now when dialog is open first toggle group buttons need to have autoFocus
          otherwise the following "Choose image" button is focused
          https://github.com/radix-ui/primitives/pull/2027
          https://github.com/radix-ui/primitives/issues/1910
          */}
            <ToggleGroupButton value={"image"} autoFocus={true}>
              <Flex css={{ px: theme.spacing[2] }}>Image</Flex>
            </ToggleGroupButton>
            <ToggleGroupButton value={"gradient"}>
              <Flex css={{ px: theme.spacing[2] }}>Gradient</Flex>
            </ToggleGroupButton>
          </ToggleGroup>
        </Flex>
      </BackgroundSection>

      <Separator css={{ gridColumn: "span 2" }} />

      <BackgroundSection>
        <Grid
          css={{ gridTemplateColumns: `1fr ${theme.spacing[23]}` }}
          align="center"
          gap={2}
        >
          {imageGradientToggle === "image" && (
            <>
              <Flex css={{ height: "100%" }} align="start">
                <PropertyInlineLabel
                  label="Image"
                  description={propertyDescriptions.backgroundImage}
                  properties={["backgroundImage"]}
                />
              </Flex>

              <FloatingPanelProvider container={elementRef}>
                <ImageControl property="backgroundImage" index={index} />
              </FloatingPanelProvider>
            </>
          )}

          <PropertyInlineLabel
            label="Clip"
            description={propertyDescriptions.backgroundClip}
            properties={["backgroundClip"]}
          />

          <SelectControl property="backgroundClip" />

          <PropertyInlineLabel
            label="Origin"
            description={propertyDescriptions.backgroundOrigin}
            properties={["backgroundOrigin"]}
          />

          <SelectControl property="backgroundOrigin" />
        </Grid>

        <Spacer />

        <BackgroundSize
          setProperty={setProperty}
          deleteProperty={deleteProperty}
          currentStyle={currentStyle}
        />

        <Spacer />

        <BackgroundPosition
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />

        <Grid
          css={{
            gridTemplateColumns: `1fr ${theme.spacing[22]}`,
            mt: theme.spacing[5],
          }}
          align="center"
          gap={2}
        >
          {imageGradientToggle === "image" && <BackgroundRepeat {...props} />}

          <PropertyInlineLabel
            label="Attachment"
            description={propertyDescriptions.backgroundAttachment}
            properties={["backgroundAttachment"]}
          />

          <Flex css={{ justifySelf: "end" }}>
            <ToggleGroup
              type="single"
              value={toValue(currentStyle.backgroundAttachment?.value)}
              onValueChange={(value) => {
                setProperty("backgroundAttachment")({
                  type: "keyword",
                  value,
                });
              }}
            >
              <ToggleGroupButton value={"scroll"}>
                <Flex css={{ px: theme.spacing[3] }}>Scroll</Flex>
              </ToggleGroupButton>
              <ToggleGroupButton value={"fixed"}>
                <Flex css={{ px: theme.spacing[3] }}>Fixed</Flex>
              </ToggleGroupButton>
            </ToggleGroup>
          </Flex>

          <PropertyInlineLabel
            label="Blend mode"
            description={propertyDescriptions.backgroundBlendMode}
            properties={["backgroundBlendMode"]}
          />

          <SelectControl property="backgroundBlendMode" />
        </Grid>
      </BackgroundSection>
      <Separator css={{ gridColumn: "span 2" }} />

      {imageGradientToggle === "image" ? (
        <BackgroundImage
          setProperty={setProperty}
          deleteProperty={deleteProperty}
          currentStyle={currentStyle}
        />
      ) : (
        <BackgroundGradient
          setProperty={setProperty}
          deleteProperty={deleteProperty}
          currentStyle={currentStyle}
          setBackgroundColor={props.setBackgroundColor}
        />
      )}
    </>
  );
};
