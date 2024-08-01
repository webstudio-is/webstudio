import {
  Box,
  EnhancedTooltip,
  Flex,
  Grid,
  Label,
  SmallToggleButton,
  theme,
} from "@webstudio-is/design-system";
import {
  StyleValue,
  toValue,
  UnitValue,
  type StyleProperty,
  type Unit,
} from "@webstudio-is/css-engine";
import { CssValueInput } from "../../shared/css-value-input";
import { type TransformPanelProps } from "./transform-utils";
import {
  BorderRadiusIcon,
  XAxisIcon,
  YAxisIcon,
  ZAxisIcon,
  Link2Icon,
  Link2UnlinkedIcon,
} from "@webstudio-is/icons";
import { parseCssValue } from "@webstudio-is/css-data";
import { useCallback, useState } from "react";
import type { StyleUpdateOptions } from "../../shared/use-style-data";
import type { IntermediateStyleValue } from "../../shared/css-value-input/css-value-input";

const property: StyleProperty = "scale";
// When a scale shorthand proeprty is used, we can't set keywords.
// i.e scale: none 50% 100% is invalid.
// So we use a fake property which don't have any initial keywords.
// scale proeprties initial value is none. So, the individual scaleX, scaleY, scaleZ proeprties
// will show none in the input field if used scale directly.
const fakeProperty: StyleProperty = "opacity";

// We need to have a custom conversion function for unit values.
// Unlike individual proeprties, here all three goes under a single scale proeprty
// So, whne we try to save for x, the other two y and z should be updated as well.
// And we need to make sure they are saved as unit values and not intermediate values.
const convertToUnitValue = (
  value: StyleValue | IntermediateStyleValue
): UnitValue | undefined => {
  if (value.type === "unit") {
    return value;
  }

  if (value.type === "intermediate") {
    let propValue;
    if (value.unit === "number") {
      propValue = value.value;
    } else if (value.unit !== undefined) {
      propValue = value.value.replace(value.unit, "");
    }

    return {
      type: "unit",
      value: Number(propValue),
      unit: value.unit as Unit,
    };
  }
};

export const ScalePanelContent = (props: TransformPanelProps) => {
  const { propertyValue, setProperty, deleteProperty } = props;
  const [scaleX, scaleY, scaleZ] = propertyValue.value;
  const [isScalingLocked, setScalingLock] = useState(true);
  const [intermediateScalingX, setIntermediateScalingX] = useState<
    StyleValue | IntermediateStyleValue
  >(scaleX);
  const [intermediateScalingY, setIntermediateScalingY] = useState<
    StyleValue | IntermediateStyleValue
  >(scaleY);
  const [intermediateScalingZ, setIntermediateScalingZ] = useState<
    StyleValue | IntermediateStyleValue
  >(scaleZ);

  const handleToggleScaling = () => {
    const lockScaling = isScalingLocked === true ? false : true;
    setScalingLock(lockScaling);
    if (lockScaling === true) {
      setIntermediateScalingY(intermediateScalingX);
      updateScaleValues(
        {
          scaleX: intermediateScalingX,
          scaleY: intermediateScalingX,
          scaleZ: intermediateScalingZ,
        },
        { isEphemeral: false }
      );
    }
  };

  const updateScaleValues = useCallback(
    (
      params: {
        scaleX: StyleValue | IntermediateStyleValue;
        scaleY: StyleValue | IntermediateStyleValue;
        scaleZ: StyleValue | IntermediateStyleValue;
      },
      options: StyleUpdateOptions
    ) => {
      const x = convertToUnitValue(params.scaleX);
      const y = convertToUnitValue(params.scaleY);
      const z = convertToUnitValue(params.scaleZ);

      const result = parseCssValue(
        "scale",
        `${toValue(x)} ${toValue(y)} ${toValue(z)}`
      );

      if (result.type === "invalid" || result.type !== "tuple") {
        return;
      }

      setProperty(property)(result, options);
    },
    [setProperty]
  );

  const handleOnChange = useCallback(
    (
      prop: "scaleX" | "scaleY" | "scaleZ",
      value: StyleValue | IntermediateStyleValue,
      options: StyleUpdateOptions
    ) => {
      let x = intermediateScalingX;
      let y = intermediateScalingY;
      let z = intermediateScalingZ;

      if (prop === "scaleX") {
        setIntermediateScalingX(value);
        x = value;
        if (isScalingLocked === true) {
          setIntermediateScalingY(value);
          y = value;
        }
      }

      if (prop === "scaleY") {
        setIntermediateScalingY(value);
        y = value;
        if (isScalingLocked === true) {
          setIntermediateScalingX(value);
          x = value;
        }
      }

      if (prop === "scaleZ") {
        setIntermediateScalingZ(value);
        z = value;
      }

      if (value.type !== "intermediate") {
        updateScaleValues({ scaleX: x, scaleY: y, scaleZ: z }, options);
      }
    },
    [
      intermediateScalingX,
      intermediateScalingY,
      intermediateScalingZ,
      isScalingLocked,
      updateScaleValues,
    ]
  );

  return (
    <Flex>
      <Flex direction="column" gap={2}>
        <Grid
          gap={1}
          css={{ alignItems: "center", gridTemplateColumns: "auto 1fr 1fr" }}
        >
          <XAxisIcon />
          <Label> Scale X</Label>
          <CssValueInput
            key="scaleX"
            styleSource="local"
            property={fakeProperty}
            keywords={[]}
            value={scaleX}
            intermediateValue={intermediateScalingX}
            onChange={(value) => {
              if (value === undefined) {
                deleteProperty(property, { isEphemeral: true });
                return;
              }

              handleOnChange("scaleX", value, { isEphemeral: true });
            }}
            onChangeComplete={(value) => {
              if (value === undefined) {
                deleteProperty(property, { isEphemeral: true });
                return;
              }

              handleOnChange("scaleX", value.value, { isEphemeral: false });
            }}
            onHighlight={(value) => {
              if (value === undefined) {
                deleteProperty(property, { isEphemeral: true });
                return;
              }

              handleOnChange("scaleX", value, { isEphemeral: true });
            }}
            onAbort={() => deleteProperty(property, { isEphemeral: true })}
          />
        </Grid>
        <Grid
          gap={1}
          css={{ alignItems: "center", gridTemplateColumns: "auto 1fr 1fr" }}
        >
          <YAxisIcon />
          <Label> Scale Y</Label>
          <CssValueInput
            key="scaleY"
            styleSource="local"
            property={fakeProperty}
            keywords={[]}
            value={scaleY}
            intermediateValue={intermediateScalingY}
            onChange={(value) => {
              if (value === undefined) {
                deleteProperty(property, { isEphemeral: true });
                return;
              }

              handleOnChange("scaleY", value, { isEphemeral: true });
            }}
            onChangeComplete={(value) => {
              if (value === undefined) {
                deleteProperty(property, { isEphemeral: true });
                return;
              }

              handleOnChange("scaleY", value.value, { isEphemeral: false });
            }}
            onHighlight={(value) => {
              if (value === undefined) {
                deleteProperty(property, { isEphemeral: true });
                return;
              }

              handleOnChange("scaleY", value, { isEphemeral: true });
            }}
            onAbort={() => deleteProperty(property, { isEphemeral: true })}
          />
        </Grid>
        <Grid
          gap={1}
          css={{ alignItems: "center", gridTemplateColumns: "auto 1fr 1fr" }}
        >
          <ZAxisIcon />
          <Label> Scale Z</Label>
          <CssValueInput
            key="scaleZ"
            styleSource="local"
            property={fakeProperty}
            keywords={[]}
            value={scaleZ}
            intermediateValue={intermediateScalingZ}
            onChange={(value) => {
              if (value === undefined) {
                deleteProperty(property, { isEphemeral: true });
                return;
              }
              handleOnChange("scaleZ", value, { isEphemeral: true });
            }}
            onChangeComplete={(value) => {
              if (value === undefined) {
                deleteProperty(property, { isEphemeral: true });
                return;
              }

              handleOnChange("scaleZ", value.value, { isEphemeral: false });
            }}
            onHighlight={(value) => {
              if (value === undefined) {
                deleteProperty(property, { isEphemeral: true });
                return;
              }

              handleOnChange("scaleZ", value, { isEphemeral: true });
            }}
            onAbort={() => deleteProperty(property, { isEphemeral: true })}
          />
        </Grid>
      </Flex>
      <Flex
        direction="column"
        css={{ paddingLeft: theme.spacing[5], marginTop: theme.spacing[3] }}
      >
        <Box css={{ rotate: "90deg" }}>
          <BorderRadiusIcon size="12" />
        </Box>
        <EnhancedTooltip
          content={
            isScalingLocked === true
              ? "Unlink scale-x and scale-y values"
              : "Link scale-x and scale-y values"
          }
        >
          <SmallToggleButton
            css={{ rotate: "90deg" }}
            pressed={isScalingLocked}
            onPressedChange={handleToggleScaling}
            variant="normal"
            icon={isScalingLocked ? <Link2Icon /> : <Link2UnlinkedIcon />}
          />
        </EnhancedTooltip>
        <Box css={{ rotate: "180deg" }}>
          <BorderRadiusIcon size="12" />
        </Box>
      </Flex>
    </Flex>
  );
};
