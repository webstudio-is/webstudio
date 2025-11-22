/**
 * Will be fully rewritten in next iteration,
 * as of now just implement feature parity with old backgrounds section
 **/

import { type ReactNode, useCallback, useRef, useState } from "react";
import { propertyDescriptions } from "@webstudio-is/css-data";
import {
  RepeatGridIcon,
  RepeatColumnIcon,
  RepeatRowIcon,
  XSmallIcon,
  ImageIcon,
  GradientLinearIcon,
  GradientConicIcon,
  GradientRadialIcon,
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
  Box,
  EnhancedTooltip,
  ScrollArea,
} from "@webstudio-is/design-system";
import { SelectControl } from "../../controls";
import { ToggleGroupTooltip } from "../../controls/toggle-group/toggle-group-control";
import { BackgroundSize } from "./background-size";
import { BackgroundGradient } from "./background-gradient";
import { BackgroundImage } from "./background-image";
import { BackgroundPosition } from "./background-position";
import {
  PropertyLabel,
  PropertyValueTooltip,
  PropertyInlineLabel,
} from "../../property-label";
import { useComputedStyleDecl } from "../../shared/model";
import {
  getRepeatedStyleItem,
  setRepeatedStyleItem,
} from "../../shared/repeated-style";
import type { ComputedStyleDecl } from "~/shared/style-object-model";
import {
  detectBackgroundType,
  formatGradientForType,
  getBackgroundStyleItem,
  type BackgroundType,
} from "./gradient-utils";
import { CollapsibleSectionRoot } from "~/builder/shared/collapsible-section";

const ColorSwatchIcon = styled("div", {
  width: theme.spacing[7],
  height: theme.spacing[7],
  borderRadius: theme.borderRadius[3],
  backgroundColor: theme.colors.foregroundMain,
  boxShadow: `inset 0 0 0 1px ${theme.colors.borderMain}`,
});

type BackgroundTypeOption = {
  value: BackgroundType;
  label: string;
  description: string;
  code: string;
  icon: ReactNode;
  autoFocus?: boolean;
};

// looks like now when dialog is open first toggle group buttons need to have autoFocus
// otherwise the following "Choose image" button is focused
// https://github.com/radix-ui/primitives/pull/2027
// https://github.com/radix-ui/primitives/issues/1910
const backgroundTypeOptions: BackgroundTypeOption[] = [
  {
    value: "image",
    label: "Image",
    description:
      "Use an image asset, remote URL, or data URI as the layer background.",
    code: "background-image: url(...);",
    icon: <ImageIcon />,
    autoFocus: true,
  },
  {
    value: "solid",
    label: "Solid",
    description:
      "Use a single color layer while keeping control over stacking order.",
    code: "background-image: linear-gradient(color, color);",
    icon: <ColorSwatchIcon />,
  },
  {
    value: "linearGradient",
    label: "Linear gradient",
    description:
      "Blend multiple colors along a line to create smooth transitions.",
    code: "background-image: linear-gradient(...);",
    icon: <GradientLinearIcon />,
  },
  {
    value: "radialGradient",
    label: "Radial gradient",
    description:
      "Blend multiple colors in a circular pattern to create smooth transitions.",
    code: "background-image: radial-gradient(...);",
    icon: <GradientRadialIcon />,
  },
  {
    value: "conicGradient",
    label: "Conic gradient",
    description:
      "Spin colors around a center point for charts, dials, and spotlight effects.",
    code: "background-image: conic-gradient(...);",
    icon: <GradientConicIcon />,
  },
];

type BackgroundTypeToggleProps = {
  value: BackgroundType;
  onChange: (value: BackgroundType) => void;
  backgroundStyleItem: StyleValue | undefined;
  styleDecl: ComputedStyleDecl;
  index: number;
  cachedValues: React.MutableRefObject<
    Partial<Record<BackgroundType, StyleValue>>
  >;
};

const BackgroundTypeToggle = ({
  value,
  onChange,
  backgroundStyleItem,
  styleDecl,
  index,
  cachedValues,
}: BackgroundTypeToggleProps) => {
  const handleValueChange = useCallback(
    (nextValue: BackgroundType) => {
      if (nextValue === value) {
        return;
      }

      // Cache current value before switching
      if (backgroundStyleItem !== undefined) {
        cachedValues.current[value] = backgroundStyleItem;
      }

      onChange(nextValue);

      // Check if we have a cached value for the new type
      const cachedValue = cachedValues.current[nextValue];

      if (nextValue === "image") {
        // For image, restore cached value or set to none
        if (cachedValue !== undefined) {
          setRepeatedStyleItem(styleDecl, index, cachedValue);
        } else {
          setRepeatedStyleItem(styleDecl, index, {
            type: "keyword",
            value: "none",
          });
        }
      } else {
        // For gradients and solid color, restore cached or generate new
        const gradientValue = cachedValue
          ? cachedValue.type === "unparsed"
            ? cachedValue.value
            : formatGradientForType(cachedValue, nextValue)
          : formatGradientForType(backgroundStyleItem, nextValue);

        setRepeatedStyleItem(styleDecl, index, {
          type: "unparsed",
          value: gradientValue,
        });
      }
    },
    [backgroundStyleItem, index, onChange, styleDecl, value, cachedValues]
  );

  return (
    <ToggleGroup
      type="single"
      value={value}
      aria-label="Background type"
      onValueChange={handleValueChange}
    >
      {backgroundTypeOptions.map(
        ({ value: optionValue, label, icon, autoFocus }) => (
          <EnhancedTooltip key={optionValue} content={label}>
            <ToggleGroupButton
              value={optionValue}
              aria-label={label}
              autoFocus={autoFocus}
            >
              <Flex css={{ px: theme.spacing[3] }}>{icon}</Flex>
            </ToggleGroupButton>
          </EnhancedTooltip>
        )
      )}
    </ToggleGroup>
  );
};

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
    <PropertyValueTooltip
      label="Repeat"
      description={propertyDescriptions.backgroundRepeat}
      properties={["background-repeat"]}
    >
      <ToggleGroup
        type="single"
        value={toValue(value)}
        aria-label="Background repeat"
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
              aria-label={
                item.value === "no-repeat"
                  ? "Do not repeat background"
                  : item.value === "repeat"
                    ? "Repeat background"
                    : item.value === "repeat-y"
                      ? "Repeat background vertically"
                      : "Repeat background horizontally"
              }
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
    </PropertyValueTooltip>
  );
};

const BackgroundAttachment = ({ index }: { index: number }) => {
  const styleDecl = useComputedStyleDecl("background-attachment");
  const value = getRepeatedStyleItem(styleDecl, index);
  return (
    <PropertyValueTooltip
      label="Attachment"
      description={propertyDescriptions.backgroundAttachment}
      properties={["background-attachment"]}
    >
      <ToggleGroup
        type="single"
        value={toValue(value)}
        aria-label="Background attachment"
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
    </PropertyValueTooltip>
  );
};

const OtherLayerProperties = ({ index }: { index: number }) => {
  return (
    <CollapsibleSectionRoot label={"More properties"} fullWidth={true}>
      <Flex
        gap="2"
        direction="column"
        css={{ paddingInline: theme.panel.paddingInline }}
      >
        <Grid columns={2} gap={2}>
          <PropertyLabel
            label="Blend mode"
            description={propertyDescriptions.backgroundBlendMode}
            properties={["background-blend-mode"]}
          />
          <SelectControl property="background-blend-mode" index={index} />
        </Grid>
        <BackgroundSize index={index} />
        <BackgroundPosition index={index} />
        <Grid columns={2} align="center" gap={2}>
          <PropertyLabel
            label="Repeat"
            description={propertyDescriptions.backgroundRepeat}
            properties={["background-repeat"]}
          />
          <BackgroundRepeat index={index} />

          <PropertyLabel
            label="Attachment"
            description={propertyDescriptions.backgroundAttachment}
            properties={["background-attachment"]}
          />
          <BackgroundAttachment index={index} />
        </Grid>
        <Grid columns={2} align="center" gap={2}>
          <PropertyLabel
            label="Clip"
            description={propertyDescriptions.backgroundClip}
            properties={["background-clip"]}
          />
          <SelectControl property="background-clip" index={index} />

          <PropertyLabel
            label="Origin"
            description={propertyDescriptions.backgroundOrigin}
            properties={["background-origin"]}
          />
          <SelectControl property="background-origin" index={index} />
        </Grid>
      </Flex>
    </CollapsibleSectionRoot>
  );
};

export const BackgroundContent = ({ index }: { index: number }) => {
  const backgroundImage = useComputedStyleDecl("background-image");
  const backgroundStyleItem = getBackgroundStyleItem(backgroundImage, index);

  const [backgroundType, setBackgroundType] = useState<BackgroundType>(() =>
    detectBackgroundType(backgroundStyleItem)
  );

  // Cache background values for each type to preserve user's intermediate changes
  const cachedValuesRef = useRef<Partial<Record<BackgroundType, StyleValue>>>(
    {}
  );

  return (
    <>
      <Flex
        align="center"
        gap="2"
        justify="between"
        css={{ padding: theme.panel.padding }}
        shrink={false}
      >
        <PropertyInlineLabel
          label="Type"
          description={propertyDescriptions.backgroundImage}
        />
        <BackgroundTypeToggle
          value={backgroundType}
          onChange={setBackgroundType}
          backgroundStyleItem={backgroundStyleItem}
          styleDecl={backgroundImage}
          index={index}
          cachedValues={cachedValuesRef}
        />
      </Flex>

      <Separator />

      <ScrollArea>
        <Box css={{ maxHeight: 500 }}>
          {(backgroundType === "linearGradient" ||
            backgroundType === "conicGradient" ||
            backgroundType === "radialGradient" ||
            backgroundType === "solid") && (
            <BackgroundGradient
              index={index}
              type={
                backgroundType === "conicGradient"
                  ? "conic"
                  : backgroundType === "radialGradient"
                    ? "radial"
                    : "linear"
              }
              variant={backgroundType === "solid" ? "solid" : "default"}
            />
          )}

          {backgroundType === "image" && <BackgroundImage index={index} />}

          <Separator />

          <OtherLayerProperties index={index} />
        </Box>
      </ScrollArea>
    </>
  );
};
