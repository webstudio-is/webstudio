import {
  Box,
  Flex,
  Grid,
  Label,
  SmallIconButton,
  theme,
} from "@webstudio-is/design-system";
import { toValue, type StyleProperty } from "@webstudio-is/css-engine";
import { CssValueInput } from "../../shared/css-value-input";
import { type TransformPanelProps } from "./transform-utils";
import {
  BorderRadiusIcon,
  XAxisIcon,
  YAxisIcon,
  ZAxisIcon,
  LockIcon,
  UnlockIcon,
} from "@webstudio-is/icons";
import { parseCssValue } from "@webstudio-is/css-data";
import { useCallback, useState } from "react";
import type {
  CssValueInputValue,
  IntermediateStyleValue,
} from "../../shared/css-value-input/css-value-input";
import type { StyleUpdateOptions } from "../../shared/use-style-data";

// We use fakeProperty to pass for the CssValueInputContainer.
// As we know during parsing, the syntax for scale is wrong in the css-data package.
// https://github.com/mdn/data/pull/746
// https://developer.mozilla.org/en-US/docs/Web/CSS/opacity#syntax
// number  | percentage
const fakeProperty = "opacity";
const property: StyleProperty = "scale";

export const ScalePanelContent = (props: TransformPanelProps) => {
  const { propertyValue, setProperty, deleteProperty } = props;
  const [scaleX, scaleY, scaleZ] = propertyValue.value;
  const [isScalingLocked, setScalingLock] = useState(true);
  const [intermediateScalingX, setIntermediateScalingX] =
    useState<IntermediateStyleValue>({
      type: "intermediate",
      value: toValue(scaleX),
    });
  const [intermediateScalingY, setIntermediateScalingY] =
    useState<IntermediateStyleValue>({
      type: "intermediate",
      value: toValue(scaleY),
    });
  const [intermediateScalingZ, setIntermediateScalingZ] =
    useState<IntermediateStyleValue>({
      type: "intermediate",
      value: toValue(scaleZ),
    });

  const handleToggleScaling = () => {
    setScalingLock(isScalingLocked === true ? false : true);
  };

  const updateIntermediateValues = useCallback(
    (
      prop: "scaleX" | "scaleY" | "scaleZ",
      value: IntermediateStyleValue,
      options: StyleUpdateOptions
    ) => {
      if (prop === "scaleX") {
        setIntermediateScalingX(value);
        if (isScalingLocked === true) {
          setIntermediateScalingY(value);
        }
      }

      if (prop === "scaleY") {
        setIntermediateScalingY(value);
        if (isScalingLocked === true) {
          setIntermediateScalingX(value);
        }
      }

      if (prop === "scaleZ") {
        setIntermediateScalingZ(value);
      }

      const parsedValue = parseCssValue(
        property,
        [
          intermediateScalingX.value,
          intermediateScalingY.value,
          intermediateScalingZ.value,
        ].join(" ")
      );
      if (parsedValue.type === "invalid" || parsedValue.type !== "tuple") {
        return;
      }
      setProperty(property)(parsedValue, options);
    },
    [
      isScalingLocked,
      intermediateScalingX,
      intermediateScalingY,
      intermediateScalingZ,
      setProperty,
    ]
  );

  const handleOnChange = (
    prop: "scaleX" | "scaleY" | "scaleZ",
    value: CssValueInputValue,
    options: StyleUpdateOptions
  ) => {
    if (value.type === "unit") {
      updateIntermediateValues(
        prop,
        { type: "intermediate", value: toValue(value), unit: value.unit },
        options
      );
    }

    if (value.type === "intermediate") {
      updateIntermediateValues(prop, value, options);
    }
  };

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
        {isScalingLocked === true && (
          <SmallIconButton
            icon={<LockIcon size="16" />}
            onClick={handleToggleScaling}
          />
        )}
        {isScalingLocked === false && (
          <SmallIconButton
            icon={<UnlockIcon size="16" />}
            onClick={handleToggleScaling}
          />
        )}
        <Box css={{ rotate: "180deg" }}>
          <BorderRadiusIcon size="12" />
        </Box>
      </Flex>
    </Flex>
  );
};
