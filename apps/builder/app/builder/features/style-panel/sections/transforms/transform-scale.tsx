import {
  Box,
  Flex,
  Grid,
  Label,
  SmallIconButton,
  theme,
} from "@webstudio-is/design-system";
import {
  StyleValue,
  toValue,
  type StyleProperty,
} from "@webstudio-is/css-engine";
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
import { useState } from "react";

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
    useState<StyleValue>(scaleX);
  const [intermediateScalingY, setIntermediateScalingY] =
    useState<StyleValue>(scaleY);
  const [intermediateScalingZ, setIntermediateScalingZ] =
    useState<StyleValue>(scaleZ);

  const handleToggleScaling = () => {
    setScalingLock(isScalingLocked === true ? false : true);
  };

  const handleScalingPropertyUpdate = () => {
    const parsedValue = parseCssValue(
      "scale",
      `${toValue(intermediateScalingX)} ${toValue(intermediateScalingY)} ${toValue(intermediateScalingZ)}`
    );
    if (parsedValue.type === "invalid") {
      return;
    }
    setProperty(property)(parsedValue);
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
            value={intermediateScalingX}
            intermediateValue={intermediateScalingX}
            onChange={(newValue) => {
              if (newValue === undefined || newValue.type !== "unit") {
                return;
              }

              setIntermediateScalingX(newValue);
              if (isScalingLocked === true) {
                setIntermediateScalingY(newValue);
              }
            }}
            onChangeComplete={handleScalingPropertyUpdate}
            onHighlight={(value) => {
              if (value === undefined) {
                return;
              }
              handleScalingPropertyUpdate();
            }}
            onAbort={() => deleteProperty("scale", { isEphemeral: true })}
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
            value={intermediateScalingY}
            intermediateValue={intermediateScalingY}
            onChange={(newValue) => {
              if (newValue === undefined || newValue.type !== "unit") {
                return;
              }

              setIntermediateScalingY(newValue);
              if (isScalingLocked === true) {
                setIntermediateScalingX(newValue);
              }
            }}
            onChangeComplete={handleScalingPropertyUpdate}
            onHighlight={(value) => {
              if (value === undefined) {
                return;
              }
              handleScalingPropertyUpdate();
            }}
            onAbort={() => deleteProperty("scale", { isEphemeral: true })}
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
            value={intermediateScalingZ}
            intermediateValue={intermediateScalingZ}
            onChange={(newValue) => {
              if (newValue === undefined || newValue.type !== "unit") {
                return;
              }

              setIntermediateScalingZ(newValue);
            }}
            onChangeComplete={handleScalingPropertyUpdate}
            onHighlight={(value) => {
              if (value === undefined) {
                return;
              }
              handleScalingPropertyUpdate();
            }}
            onAbort={() => deleteProperty("scale", { isEphemeral: true })}
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
