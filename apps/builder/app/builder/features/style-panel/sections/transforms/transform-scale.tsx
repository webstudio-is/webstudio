import { useState } from "react";
import {
  Box,
  EnhancedTooltip,
  Flex,
  Grid,
  SmallToggleButton,
  theme,
} from "@webstudio-is/design-system";
import type { StyleValue, StyleProperty } from "@webstudio-is/css-engine";
import {
  BorderRadiusIcon,
  XAxisIcon,
  YAxisIcon,
  ZAxisIcon,
  Link2Icon,
  Link2UnlinkedIcon,
} from "@webstudio-is/icons";
import { propertySyntaxes } from "@webstudio-is/css-data";
import { CssValueInput } from "../../shared/css-value-input";
import {
  deleteProperty,
  setProperty,
  type StyleUpdateOptions,
} from "../../shared/use-style-data";
import type { IntermediateStyleValue } from "../../shared/css-value-input/css-value-input";
import { PropertyInlineLabel } from "../../property-label";
import {
  $availableUnitVariables,
  useComputedStyleDecl,
} from "../../shared/model";

const property: StyleProperty = "scale";

export const ScalePanelContent = () => {
  const styleDecl = useComputedStyleDecl(property);
  const tuple =
    styleDecl.cascadedValue.type === "tuple"
      ? styleDecl.cascadedValue
      : undefined;
  const [scaleX, scaleY, scaleZ] = tuple?.value ?? [];
  const [isScalingLocked, setScalingLock] = useState(true);
  const [intermediateScalingX, setIntermediateScalingX] = useState<
    StyleValue | IntermediateStyleValue
  >();
  const [intermediateScalingY, setIntermediateScalingY] = useState<
    StyleValue | IntermediateStyleValue
  >();
  const [intermediateScalingZ, setIntermediateScalingZ] = useState<
    StyleValue | IntermediateStyleValue
  >();

  const setAxis = (
    axis: number,
    newValue: StyleValue,
    options?: StyleUpdateOptions
  ) => {
    if (tuple === undefined) {
      return;
    }

    if (newValue.type === "tuple") {
      [newValue] = newValue.value;
    }
    if (newValue.type !== "unit" && newValue.type !== "var") {
      newValue = { type: "unit", value: 100, unit: "%" };
    }

    const newTuple = structuredClone(tuple);
    newTuple.value[axis] = newValue;
    if (isScalingLocked) {
      if (axis === 0 || axis === 1) {
        newTuple.value[0] = newValue;
        newTuple.value[1] = newValue;
      }
    }
    setProperty(property)(newTuple, options);
  };

  const toggleScaling = () => {
    const lockScaling = isScalingLocked === true ? false : true;
    setScalingLock(lockScaling);
    if (lockScaling === true) {
      setAxis(1, scaleX);
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
          <PropertyInlineLabel
            label="Scale X"
            description={propertySyntaxes.scaleX}
          />
          <CssValueInput
            styleSource="local"
            property={property}
            getOptions={() => $availableUnitVariables.get()}
            value={scaleX}
            intermediateValue={intermediateScalingX}
            onChange={(value) => {
              setIntermediateScalingX(value);
              if (isScalingLocked) {
                setIntermediateScalingY(value);
              }
              if (value === undefined) {
                deleteProperty(property, { isEphemeral: true });
              } else if (value.type !== "intermediate") {
                setAxis(0, value, { isEphemeral: true });
              }
            }}
            onChangeComplete={({ value }) => {
              setIntermediateScalingX(undefined);
              setIntermediateScalingY(undefined);
              setAxis(0, value);
            }}
            onHighlight={(value) => {
              if (value === undefined) {
                deleteProperty(property, { isEphemeral: true });
              } else {
                setAxis(0, value, { isEphemeral: true });
              }
            }}
            onAbort={() => deleteProperty(property, { isEphemeral: true })}
            onReset={() => {
              deleteProperty(property);
            }}
          />
        </Grid>
        <Grid
          gap={1}
          css={{ alignItems: "center", gridTemplateColumns: "auto 1fr 1fr" }}
        >
          <YAxisIcon />
          <PropertyInlineLabel
            label="Scale Y"
            description={propertySyntaxes.scaleY}
          />
          <CssValueInput
            styleSource="local"
            property={property}
            getOptions={() => $availableUnitVariables.get()}
            value={scaleY}
            intermediateValue={intermediateScalingY}
            onChange={(value) => {
              setIntermediateScalingY(value);
              if (isScalingLocked) {
                setIntermediateScalingX(value);
              }
              if (value === undefined) {
                deleteProperty(property, { isEphemeral: true });
              } else if (value.type !== "intermediate") {
                setAxis(1, value, { isEphemeral: true });
              }
            }}
            onChangeComplete={({ value }) => {
              setIntermediateScalingY(undefined);
              setIntermediateScalingX(undefined);
              setAxis(1, value);
            }}
            onHighlight={(value) => {
              if (value === undefined) {
                deleteProperty(property, { isEphemeral: true });
              } else {
                setAxis(1, value, { isEphemeral: true });
              }
            }}
            onAbort={() => deleteProperty(property, { isEphemeral: true })}
            onReset={() => {
              deleteProperty(property);
            }}
          />
        </Grid>
        <Grid
          gap={1}
          css={{ alignItems: "center", gridTemplateColumns: "auto 1fr 1fr" }}
        >
          <ZAxisIcon />
          <PropertyInlineLabel
            label="Scale Z"
            description={propertySyntaxes.scaleZ}
          />
          <CssValueInput
            styleSource="local"
            property={property}
            getOptions={() => $availableUnitVariables.get()}
            value={scaleZ}
            intermediateValue={intermediateScalingZ}
            onChange={(value) => {
              setIntermediateScalingZ(value);
              if (value === undefined) {
                deleteProperty(property, { isEphemeral: true });
              } else if (value.type !== "intermediate") {
                setAxis(2, value, { isEphemeral: true });
              }
            }}
            onChangeComplete={({ value }) => {
              setIntermediateScalingZ(undefined);
              setAxis(2, value, { isEphemeral: false });
            }}
            onHighlight={(value) => {
              if (value === undefined) {
                deleteProperty(property, { isEphemeral: true });
              } else {
                setAxis(2, value, { isEphemeral: true });
              }
            }}
            onAbort={() => deleteProperty(property, { isEphemeral: true })}
            onReset={() => {
              deleteProperty(property);
            }}
          />
        </Grid>
      </Flex>
      <Flex
        direction="column"
        css={{ paddingLeft: theme.spacing[3], width: theme.spacing[11] }}
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
            onPressedChange={toggleScaling}
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
