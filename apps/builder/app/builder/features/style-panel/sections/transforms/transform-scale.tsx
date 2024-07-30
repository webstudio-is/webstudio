import {
  Box,
  Flex,
  Grid,
  Label,
  SmallToggleButton,
  theme,
} from "@webstudio-is/design-system";
import {
  toValue,
  TupleValueItem,
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
import { useState } from "react";
import type { StyleUpdateOptions } from "../../shared/use-style-data";
import type { CssValueInputValue } from "../../shared/css-value-input/css-value-input";

const property: StyleProperty = "scale";

export const ScalePanelContent = (props: TransformPanelProps) => {
  const { propertyValue, setProperty, deleteProperty } = props;
  const [scaleX, scaleY, scaleZ] = propertyValue.value;
  const [isScalingLocked, setScalingLock] = useState(true);
  const [intermediateScalingX, setIntermediateScalingX] =
    useState<TupleValueItem>(scaleX);
  const [intermediateScalingY, setIntermediateScalingY] =
    useState<TupleValueItem>(scaleY);
  const [intermediateScalingZ, setIntermediateScalingZ] =
    useState<TupleValueItem>(scaleZ);

  const handleToggleScaling = () => {
    const lockScaling = isScalingLocked === true ? false : true;
    setScalingLock(lockScaling);
    if (lockScaling === true) {
      setIntermediateScalingY(intermediateScalingX);
      updateScalingValues(
        [intermediateScalingX, intermediateScalingX, intermediateScalingZ],
        { isEphemeral: false }
      );
    }
  };

  const updateIndividualScaleValues = (
    prop: "scaleX" | "scaleY" | "scaleZ",
    value: UnitValue,
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

    updateScalingValues(
      [intermediateScalingX, intermediateScalingY, intermediateScalingZ],
      options
    );
  };

  const updateScalingValues = (
    values: Array<TupleValueItem>,
    options: StyleUpdateOptions
  ) => {
    const parsedValue = parseCssValue(
      "scale",
      toValue({
        type: "tuple",
        value: values,
      })
    );

    if (parsedValue.type === "invalid") {
      return;
    }

    setProperty(property)(parsedValue, options);
  };

  const handleOnChange = (
    prop: "scaleX" | "scaleY" | "scaleZ",
    value: TupleValueItem | CssValueInputValue,
    options: StyleUpdateOptions
  ) => {
    if (value.type === "intermediate") {
      const unitValue: UnitValue = {
        type: "unit",
        value: value.unit
          ? Number(value.value.replace(value.unit, ""))
          : Number(value.value),
        unit: value.unit as Unit,
      };
      updateIndividualScaleValues(prop, unitValue, options);
    }

    if (value.type === "unit") {
      updateIndividualScaleValues(prop, value, options);
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
            property={property}
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
            property={property}
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
            property={property}
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
        <SmallToggleButton
          css={{ rotate: "90deg" }}
          pressed={isScalingLocked}
          onPressedChange={handleToggleScaling}
          variant="normal"
          icon={isScalingLocked ? <Link2Icon /> : <Link2UnlinkedIcon />}
        />
        <Box css={{ rotate: "180deg" }}>
          <BorderRadiusIcon size="12" />
        </Box>
      </Flex>
    </Flex>
  );
};
