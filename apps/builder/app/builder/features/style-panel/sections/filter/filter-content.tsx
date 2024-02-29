import type {
  InvalidValue,
  LayerValueItem,
  LayersValue,
  TupleValue,
} from "@webstudio-is/css-engine";
import {
  Flex,
  theme,
  Label,
  Tooltip,
  Text,
  TextArea,
  textVariants,
} from "@webstudio-is/design-system";
import { InfoCircleIcon } from "@webstudio-is/icons";
import { useState } from "react";
import type { IntermediateStyleValue } from "../../shared/css-value-input";
import { parseFilter } from "@webstudio-is/css-data";

type FilterContentProps = {
  index: number;
  layer: LayerValueItem;
  filter: string;
  onEditLayer: (index: number, layers: LayersValue) => void;
};

export const FilterSectionContent = ({
  layer,
  index,
  filter,
  onEditLayer,
}: FilterContentProps) => {
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

    const layers = parseFilter(intermediateValue.value);
    if (layers.type === "invalid") {
      setIntermediateValue({
        type: "invalid",
        value: intermediateValue.value,
      });
      return;
    }

    onEditLayer(index, layers);
  };

  return (
    <Flex
      direction="column"
      css={{
        px: theme.spacing[9],
        paddingTop: theme.spacing[5],
        paddingBottom: theme.spacing[9],
        gap: theme.spacing[3],
        minWidth: theme.spacing[30],
      }}
    >
      <Label>
        <Flex align={"center"} gap={1}>
          Code
          <Tooltip
            variant="wrapped"
            content={<Text>TODO: Add content for the filter tooltip</Text>}
          >
            <InfoCircleIcon />
          </Tooltip>
        </Flex>
      </Label>
      <TextArea
        rows={3}
        name="description"
        value={intermediateValue?.value ?? filter ?? ""}
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
