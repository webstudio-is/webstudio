/**
 * Will be fully rewritten in next iteration,
 * as of now just implement feature parity with old backgrounds section
 **/

import { useEffect, useState } from "react";
import {
  propertyDescriptions,
  parseLinearGradient,
  parseConicGradient,
  formatLinearGradient,
  formatConicGradient,
  type ParsedLinearGradient,
  type ParsedConicGradient,
} from "@webstudio-is/css-data";
import {
  RepeatGridIcon,
  RepeatColumnIcon,
  RepeatRowIcon,
  XSmallIcon,
  ImageIcon,
  GradientLinearIcon,
  GradientConicIcon,
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
} from "@webstudio-is/design-system";
import { SelectControl } from "../../controls";
import { BackgroundSize } from "./background-size";
import { BackgroundLinearGradient } from "./background-linear-gradient";
import { BackgroundImage } from "./background-image";
import { BackgroundPosition } from "./background-position";
import { PropertyInlineLabel } from "../../property-label";
import { ToggleGroupTooltip } from "../../controls/toggle-group/toggle-group-control";
import { useComputedStyleDecl } from "../../shared/model";
import {
  getRepeatedStyleItem,
  setRepeatedStyleItem,
} from "../../shared/repeated-style";
import type { ComputedStyleDecl } from "~/shared/style-object-model";

type BackgroundType = "image" | "linearGradient" | "conicGradient";

const createDefaultStops = () => [
  {
    color: { type: "rgb", r: 0, g: 0, b: 0, alpha: 1 },
    position: { type: "unit", unit: "%", value: 0 },
  },
  {
    color: { type: "rgb", r: 255, g: 255, b: 255, alpha: 1 },
    position: { type: "unit", unit: "%", value: 100 },
  },
];

const createDefaultLinearGradient = (): ParsedLinearGradient => ({
  type: "linear",
  stops: createDefaultStops(),
});

const createDefaultConicGradient = (): ParsedConicGradient => ({
  type: "conic",
  stops: createDefaultStops(),
});

const formatGradientForType = (
  styleValue: StyleValue | undefined,
  target: Exclude<BackgroundType, "image">
) => {
  const cssValue = styleValue === undefined ? "" : toValue(styleValue);
  const gradientString = typeof cssValue === "string" ? cssValue : "";
  if (target === "linearGradient") {
    const parsed =
      (gradientString.length > 0
        ? parseLinearGradient(gradientString)
        : undefined) ?? createDefaultLinearGradient();
    return formatLinearGradient(parsed);
  }

  const parsed =
    (gradientString.length > 0
      ? parseConicGradient(gradientString)
      : undefined) ?? createDefaultConicGradient();
  return formatConicGradient(parsed);
};

const detectBackgroundType = (styleValue?: StyleValue): BackgroundType => {
  if (styleValue === undefined) {
    return "image";
  }

  if (styleValue.type === "image") {
    return "image";
  }

  if (styleValue.type === "keyword") {
    // The only allowed keyword for backgroundImage is none
    return "image";
  }

  const cssValue = toValue(styleValue);
  if (typeof cssValue === "string") {
    if (parseLinearGradient(cssValue) !== undefined) {
      return "linearGradient";
    }
    if (parseConicGradient(cssValue) !== undefined) {
      return "conicGradient";
    }
  }

  return "image";
};

const getStyleValueKey = (styleValue?: StyleValue) => {
  if (styleValue === undefined) {
    return "undefined";
  }

  if (styleValue.type === "image") {
    const image = styleValue.value;
    if (image.type === "asset") {
      return `image-asset:${image.value}`;
    }
    if (image.type === "url") {
      return `image-url:${image.url}`;
    }
  }

  if (styleValue.type === "keyword") {
    return `keyword:${styleValue.value}`;
  }

  return `${styleValue.type}:${toValue(styleValue)}`;
};

const isBackgroundType = (value: string): value is BackgroundType => {
  return (
    value === "image" || value === "linearGradient" || value === "conicGradient"
  );
};

const getBackgroundStyleItem = (
  styleDecl: ComputedStyleDecl,
  index: number
) => {
  const repeatedItem = getRepeatedStyleItem(styleDecl, index);
  if (repeatedItem !== undefined) {
    return repeatedItem;
  }

  if (index > 0) {
    return;
  }

  const cascaded = styleDecl.cascadedValue;
  if (cascaded.type === "layers" || cascaded.type === "tuple") {
    return cascaded.value[0];
  }

  return cascaded;
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
  );
};

const BackgroundAttachment = ({ index }: { index: number }) => {
  const styleDecl = useComputedStyleDecl("background-attachment");
  const value = getRepeatedStyleItem(styleDecl, index);
  return (
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
  );
};

export const BackgroundContent = ({ index }: { index: number }) => {
  const backgroundImage = useComputedStyleDecl("background-image");
  const backgroundStyleItem = getBackgroundStyleItem(backgroundImage, index);

  const [backgroundType, setBackgroundType] = useState<BackgroundType>(() =>
    detectBackgroundType(backgroundStyleItem)
  );
  const [syncedStyleKey, setSyncedStyleKey] = useState(() =>
    getStyleValueKey(backgroundStyleItem)
  );
  useEffect(() => {
    const nextStyleKey = getStyleValueKey(backgroundStyleItem);
    if (nextStyleKey === syncedStyleKey) {
      return;
    }
    setSyncedStyleKey(nextStyleKey);
    const nextType = detectBackgroundType(backgroundStyleItem);
    if (nextType !== backgroundType) {
      setBackgroundType(nextType);
    }
  }, [backgroundStyleItem, backgroundType, syncedStyleKey]);

  return (
    <>
      <BackgroundSection>
        <Flex align="start" gap="2" justify="between">
          <PropertyInlineLabel
            label="Type"
            description={propertyDescriptions.backgroundImage}
            properties={["background-image"]}
          />
          <ToggleGroup
            type="single"
            value={backgroundType}
            aria-label="Background type"
            onValueChange={(value) => {
              if (isBackgroundType(value) === false) {
                return;
              }

              if (value === backgroundType) {
                return;
              }

              setBackgroundType(value);

              if (value === "linearGradient" || value === "conicGradient") {
                const gradientValue = formatGradientForType(
                  backgroundStyleItem,
                  value
                );
                setRepeatedStyleItem(backgroundImage, index, {
                  type: "unparsed",
                  value: gradientValue,
                });
              }
            }}
          >
            {/* looks like now when dialog is open first toggle group buttons need to have autoFocus
          otherwise the following "Choose image" button is focused
          https://github.com/radix-ui/primitives/pull/2027
          https://github.com/radix-ui/primitives/issues/1910
          */}
            <ToggleGroupButton
              value={"image"}
              aria-label="Image background"
              autoFocus={true}
            >
              <Flex css={{ px: theme.spacing[3] }}>
                <ImageIcon />
              </Flex>
            </ToggleGroupButton>
            <ToggleGroupButton
              value={"linearGradient"}
              aria-label="Gradient background"
            >
              <Flex css={{ px: theme.spacing[3] }}>
                <GradientLinearIcon />
              </Flex>
            </ToggleGroupButton>
            <ToggleGroupButton
              value={"conicGradient"}
              aria-label="Conic gradient background"
            >
              <Flex css={{ px: theme.spacing[3] }}>
                <GradientConicIcon />
              </Flex>
            </ToggleGroupButton>
          </ToggleGroup>
        </Flex>
      </BackgroundSection>

      <Separator />

      {(backgroundType === "linearGradient" ||
        backgroundType === "conicGradient") && (
        <BackgroundLinearGradient
          index={index}
          type={backgroundType === "conicGradient" ? "conic" : "linear"}
        />
      )}

      {backgroundType === "image" && (
        <BackgroundSection>
          <BackgroundImage index={index} />
        </BackgroundSection>
      )}

      <Separator />

      <BackgroundSection>
        <Grid
          css={{ gridTemplateColumns: `1fr ${theme.spacing[23]}` }}
          align="center"
          gap={2}
        >
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
          {backgroundType === "image" && (
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
    </>
  );
};

export const __testing__ = {
  detectBackgroundType,
};
