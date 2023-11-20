import type {
  InvalidValue,
  LayersValue,
  TupleValue,
} from "@webstudio-is/css-engine";
import { parseBoxShadow } from "@webstudio-is/css-data";
import {
  Flex,
  Label,
  Text,
  TextArea,
  textVariants,
  theme,
  Tooltip,
} from "@webstudio-is/design-system";
import { InformationIcon } from "@webstudio-is/icons";
import { useState } from "react";
import type { IntermediateStyleValue } from "../../shared/css-value-input";

type BoxShadowContentProps = {
  index: number;
  layer: TupleValue;
  value: string;
  onEditLayer: (index: number, layers: LayersValue) => void;
};

export const BoxShadowContent = (props: BoxShadowContentProps) => {
  const [intermediateValue, setIntermediateValue] = useState<
    IntermediateStyleValue | InvalidValue | undefined
  >();

  const handleChange = (value: string) => {
    setIntermediateValue({
      type: "intermediate",
      value,
    });
  };

  const handleComplete = () => {
    if (intermediateValue === undefined) {
      return;
    }
    const layers = parseBoxShadow(intermediateValue.value);
    if (layers.type === "invalid") {
      setIntermediateValue({
        type: "invalid",
        value: intermediateValue.value,
      });
      return;
    }

    props.onEditLayer(props.index, layers);
  };

  return (
    <Flex
      direction="column"
      css={{
        px: theme.spacing[5],
        py: theme.spacing[5],
        gap: theme.spacing[3],
        minWidth: theme.spacing[30],
      }}
    >
      <Label>
        <Flex align={"center"} gap={1}>
          Code
          <Tooltip
            variant="wrapped"
            content={
              <Text>
                Paste a box-shadow value, for example:
                <br />
                <br />
                0px 2px 5px 0px rgba(0, 0, 0, 0.2)
              </Text>
            }
          >
            <InformationIcon />
          </Tooltip>
        </Flex>
      </Label>
      <TextArea
        rows={3}
        name="description"
        value={intermediateValue?.value ?? props.value ?? ""}
        css={{ minHeight: theme.spacing[14], ...textVariants.mono }}
        state={intermediateValue?.type === "invalid" ? "invalid" : undefined}
        onChange={handleChange}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            handleComplete();
            event.preventDefault();
          }
        }}
      />
    </Flex>
  );
};
