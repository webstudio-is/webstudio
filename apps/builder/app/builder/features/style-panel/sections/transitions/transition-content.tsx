import type { InvalidValue, LayersValue } from "@webstudio-is/css-engine";
import {
  Flex,
  Label,
  TextArea,
  theme,
  textVariants,
} from "@webstudio-is/design-system";
import { useState } from "react";
import { parseTransition } from "@webstudio-is/css-data";
import type { CreateBatchUpdate } from "../../shared/use-style-data";
import type { IntermediateStyleValue } from "../../shared/css-value-input";

type TransitionContentProps = {
  index: number;
  value: string;
  onEditLayer: (index: number, layer: LayersValue) => void;
  createBatchUpdate: CreateBatchUpdate;
};

export const TransitionContent = (props: TransitionContentProps) => {
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
    const layers = parseTransition(intermediateValue.value);
    if (layers.type === "invalid") {
      setIntermediateValue({
        type: "invalid",
        value: intermediateValue.value,
      });
      return;
    }

    props.onEditLayer(props.index, layers);
    setIntermediateValue(undefined);
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
      <Label>Code</Label>
      <TextArea
        rows={3}
        name="description"
        css={{ minHeight: theme.spacing[14], ...textVariants.mono }}
        value={intermediateValue?.value ?? props.value ?? ""}
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
