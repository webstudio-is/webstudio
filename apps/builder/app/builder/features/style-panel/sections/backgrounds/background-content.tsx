/**
 * Will be fully rewritten in next iteration,
 * as of now just implement feature parity with old backgrounds section
 **/

import { useRef, useState } from "react";
import { propertyDescriptions } from "@webstudio-is/css-data";
import {
  RepeatGridIcon,
  RepeatColumnIcon,
  RepeatRowIcon,
  XSmallIcon,
} from "@webstudio-is/icons";
import { type StyleValue, toValue } from "@webstudio-is/css-engine";
import {
  theme,
  Flex,
  Grid,
  ToggleGroup,
  ToggleGroupButton,
  Separator,
  styled,
  FloatingPanelProvider,
} from "@webstudio-is/design-system";
import { ImageControl, SelectControl } from "../../controls";
import { BackgroundSize } from "./background-size";
import { BackgroundGradient } from "./background-gradient";
import { BackgroundImage } from "./background-image";
import { BackgroundPosition } from "./background-position";
import { PropertyInlineLabel } from "../../property-label";
import { ToggleGroupTooltip } from "../../controls/toggle-group/toggle-group-control";
import { useComputedStyleDecl } from "../../shared/model";
import {
  getRepeatedStyleItem,
  setRepeatedStyleItem,
} from "../../shared/repeated-style";

const detectImageOrGradientToggle = (styleValue?: StyleValue) => {
  if (styleValue?.type === "image") {
    return "image";
  }

  if (styleValue?.type === "keyword") {
    // The only allowed keyword for backgroundImage is none
    return "image";
  }

  return "gradient";
};

const isImageOrGradient = (value: string): value is "image" | "gradient" => {
  return value === "image" || value === "gradient";
};

const BackgroundSection = styled("div", { padding: theme.panel.padding });

const Spacer = styled("div", {
  height: theme.spacing[5],
});

const BackgroundRepeat = ({ index }: { index: number }) => {
  const styleDecl = useComputedStyleDecl("background-repeat");
  const value = getRepeatedStyleItem(styleDecl, index);
  const items = [
    {
      child: <XSmallIcon />,
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
    <ToggleGroup
      type="single"
      value={toValue(value)}
      onValueChange={(value) => {
        setRepeatedStyleItem(styleDecl, index, { type: "keyword", value });
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
          properties={["background-repeat"]}
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
  );
};

const BackgroundAttachment = ({ index }: { index: number }) => {
  const styleDecl = useComputedStyleDecl("background-attachment");
  const value = getRepeatedStyleItem(styleDecl, index);
  return (
    <ToggleGroup
      type="single"
      value={toValue(value)}
      onValueChange={(value) => {
        setRepeatedStyleItem(styleDecl, index, { type: "keyword", value });
      }}
    >
      <ToggleGroupButton value={"scroll"}>
        <Flex css={{ px: theme.spacing[3] }}>Scroll</Flex>
      </ToggleGroupButton>
      <ToggleGroupButton value={"fixed"}>
        <Flex css={{ px: theme.spacing[3] }}>Fixed</Flex>
      </ToggleGroupButton>
    </ToggleGroup>
  );
};

export const BackgroundContent = ({ index }: { index: number }) => {
  const backgroundImage = useComputedStyleDecl("background-image");

  const elementRef = useRef<HTMLDivElement>(null);
  const [imageGradientToggle, setImageGradientToggle] = useState<
    "image" | "gradient"
  >(() =>
    detectImageOrGradientToggle(getRepeatedStyleItem(backgroundImage, index))
  );

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
              <Flex css={{ px: theme.spacing[3] }}>Image</Flex>
            </ToggleGroupButton>
            <ToggleGroupButton value={"gradient"}>
              <Flex css={{ px: theme.spacing[3] }}>Gradient</Flex>
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
                  properties={["background-image"]}
                />
              </Flex>
              <FloatingPanelProvider container={elementRef}>
                <ImageControl property="background-image" index={index} />
              </FloatingPanelProvider>
            </>
          )}

          <PropertyInlineLabel
            label="Clip"
            description={propertyDescriptions.backgroundClip}
            properties={["background-clip"]}
          />
          <SelectControl property="background-clip" index={index} />

          <PropertyInlineLabel
            label="Origin"
            description={propertyDescriptions.backgroundOrigin}
            properties={["background-origin"]}
          />
          <SelectControl property="background-origin" index={index} />
        </Grid>

        <Spacer />

        <BackgroundSize index={index} />

        <Spacer />

        <BackgroundPosition index={index} />

        <Grid
          css={{
            gridTemplateColumns: `1fr ${theme.spacing[22]}`,
            mt: theme.spacing[5],
          }}
          align="center"
          gap={2}
        >
          {imageGradientToggle === "image" && (
            <>
              <PropertyInlineLabel
                label="Repeat"
                description={propertyDescriptions.backgroundRepeat}
                properties={["background-repeat"]}
              />
              <Flex css={{ justifySelf: "end" }}>
                <BackgroundRepeat index={index} />
              </Flex>
            </>
          )}

          <PropertyInlineLabel
            label="Attachment"
            description={propertyDescriptions.backgroundAttachment}
            properties={["background-attachment"]}
          />
          <Flex css={{ justifySelf: "end" }}>
            <BackgroundAttachment index={index} />
          </Flex>

          <PropertyInlineLabel
            label="Blend mode"
            description={propertyDescriptions.backgroundBlendMode}
            properties={["background-blend-mode"]}
          />
          <SelectControl property="background-blend-mode" index={index} />
        </Grid>
      </BackgroundSection>
      <Separator css={{ gridColumn: "span 2" }} />

      {imageGradientToggle === "image" ? (
        <BackgroundImage index={index} />
      ) : (
        <BackgroundGradient index={index} />
      )}
    </>
  );
};
