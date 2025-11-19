/**
 * Will be fully rewritten in next iteration,
 * as of now just implement feature parity with old backgrounds section
 **/

import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
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
  EllipsesIcon,
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
  SmallIconButton,
  FloatingPanel,
  Button,
} from "@webstudio-is/design-system";
import { SelectControl } from "../../controls";
import { BackgroundSize } from "./background-size";
import { BackgroundGradient } from "./background-gradient";
import { BackgroundImage } from "./background-image";
import { BackgroundPosition } from "./background-position";
import { PropertyLabel, PropertyValueTooltip } from "../../property-label";
import { ToggleGroupTooltip } from "../../controls/toggle-group/toggle-group-control";
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
  getStyleValueKey,
  isBackgroundType,
  type BackgroundType,
} from "./gradient-utils";

const BackgroundSection = styled("div", { padding: theme.panel.padding });

const Spacer = styled("div", {
  height: theme.spacing[5],
});

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
    value: "linearGradient",
    label: "Linear gradient",
    description:
      "Blend multiple colors along a line to create smooth transitions.",
    code: "background-image: linear-gradient(...);",
    icon: <GradientLinearIcon />,
  },
  {
    value: "conicGradient",
    label: "Conic gradient",
    description:
      "Spin colors around a center point for charts, dials, and spotlight effects.",
    code: "background-image: conic-gradient(...);",
    icon: <GradientConicIcon />,
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
    value: "solidColor",
    label: "Color",
    description:
      "Use a single color layer while keeping control over stacking order.",
    code: "background-image: linear-gradient(color, color);",
    icon: <ColorSwatchIcon />,
  },
];

type BackgroundTypeToggleProps = {
  value: BackgroundType;
  onChange: (value: BackgroundType) => void;
  backgroundStyleItem: StyleValue | undefined;
  styleDecl: ComputedStyleDecl;
  index: number;
};

const BackgroundTypeToggle = ({
  value,
  onChange,
  backgroundStyleItem,
  styleDecl,
  index,
}: BackgroundTypeToggleProps) => {
  const [activeTooltip, setActiveTooltip] = useState<
    BackgroundType | undefined
  >();

  const handleValueChange = useCallback(
    (nextValue: string) => {
      if (isBackgroundType(nextValue) === false) {
        return;
      }

      if (nextValue === value) {
        return;
      }

      onChange(nextValue);
      setActiveTooltip(undefined);

      if (nextValue !== "image") {
        const gradientValue = formatGradientForType(
          backgroundStyleItem,
          nextValue
        );
        setRepeatedStyleItem(styleDecl, index, {
          type: "unparsed",
          value: gradientValue,
        });
      }
    },
    [backgroundStyleItem, index, onChange, styleDecl, value]
  );

  return (
    <ToggleGroup
      type="single"
      value={value}
      aria-label="Background type"
      onValueChange={handleValueChange}
    >
      {backgroundTypeOptions.map(
        ({ value: optionValue, label, description, code, icon, autoFocus }) => (
          <ToggleGroupTooltip
            key={optionValue}
            isOpen={activeTooltip === optionValue}
            onOpenChange={(isOpen) =>
              setActiveTooltip(isOpen ? optionValue : undefined)
            }
            isSelected={value === optionValue}
            label={label}
            code={code}
            description={description}
            properties={["background-image"]}
          >
            <ToggleGroupButton
              value={optionValue}
              aria-label={label}
              autoFocus={autoFocus}
            >
              <Flex css={{ px: theme.spacing[3] }}>{icon}</Flex>
            </ToggleGroupButton>
          </ToggleGroupTooltip>
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

const BackgroundLayerControls = ({ index }: { index: number }) => {
  const backgroundImage = useComputedStyleDecl("background-image");
  const backgroundStyleItem = getBackgroundStyleItem(backgroundImage, index);
  const backgroundType = detectBackgroundType(backgroundStyleItem);
  return (
    <BackgroundSection>
      <Grid
        css={{ gridTemplateColumns: `1fr ${theme.spacing[23]}` }}
        align="center"
        gap={2}
      >
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
            <PropertyLabel
              label="Repeat"
              description={propertyDescriptions.backgroundRepeat}
              properties={["background-repeat"]}
            />
            <Flex css={{ justifySelf: "end" }}>
              <BackgroundRepeat index={index} />
            </Flex>
          </>
        )}

        <PropertyLabel
          label="Attachment"
          description={propertyDescriptions.backgroundAttachment}
          properties={["background-attachment"]}
        />
        <Flex css={{ justifySelf: "end" }}>
          <BackgroundAttachment index={index} />
        </Flex>

        <PropertyLabel
          label="Blend mode"
          description={propertyDescriptions.backgroundBlendMode}
          properties={["background-blend-mode"]}
        />
        <SelectControl property="background-blend-mode" index={index} />
      </Grid>
    </BackgroundSection>
  );
};

export const BackgroundLayerControlsPanelTrigger = ({
  index,
  disabled,
}: {
  index: number;
  disabled?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (disabled && isOpen) {
      setIsOpen(false);
    }
  }, [disabled, isOpen]);

  return (
    <FloatingPanel
      title="Other properties"
      placement="bottom"
      content={<BackgroundLayerControls index={index} />}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <Button
        color="ghost"
        prefix={<EllipsesIcon />}
        aria-label="Other properties"
        data-state={isOpen ? "open" : undefined}
        disabled={disabled}
        tabIndex={-1}
      />
    </FloatingPanel>
  );
};

export const BackgroundContent = ({ index }: { index: number }) => {
  const backgroundImage = useComputedStyleDecl("background-image");
  const backgroundStyleItem = getBackgroundStyleItem(backgroundImage, index);

  const [backgroundType, setBackgroundType] = useState<BackgroundType>(() =>
    detectBackgroundType(backgroundStyleItem)
  );
  const syncedStyleKeyRef = useRef(getStyleValueKey(backgroundStyleItem));
  useEffect(() => {
    const nextStyleKey = getStyleValueKey(backgroundStyleItem);
    if (nextStyleKey === syncedStyleKeyRef.current) {
      return;
    }
    syncedStyleKeyRef.current = nextStyleKey;
    const nextType = detectBackgroundType(backgroundStyleItem);
    setBackgroundType((currentType) =>
      nextType === currentType ? currentType : nextType
    );
  }, [backgroundStyleItem]);

  return (
    <>
      <BackgroundSection>
        <Flex align="start" gap="2" justify="between">
          <PropertyLabel
            label="Type"
            description={propertyDescriptions.backgroundImage}
            properties={["background-image"]}
          />
          <BackgroundTypeToggle
            value={backgroundType}
            onChange={setBackgroundType}
            backgroundStyleItem={backgroundStyleItem}
            styleDecl={backgroundImage}
            index={index}
          />
        </Flex>
      </BackgroundSection>

      <Separator />

      {(backgroundType === "linearGradient" ||
        backgroundType === "conicGradient" ||
        backgroundType === "radialGradient" ||
        backgroundType === "solidColor") && (
        <BackgroundGradient
          index={index}
          type={
            backgroundType === "conicGradient"
              ? "conic"
              : backgroundType === "radialGradient"
                ? "radial"
                : "linear"
          }
          variant={backgroundType === "solidColor" ? "solid" : "default"}
        />
      )}

      {backgroundType === "image" && (
        <BackgroundSection>
          <BackgroundImage index={index} />
        </BackgroundSection>
      )}
    </>
  );
};
