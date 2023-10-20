import type { InvalidValue, LayersValue } from "@webstudio-is/css-engine";
import { useState } from "react";

type IntermediateValue = {
  type: "intermediate";
  value: string;
};

export const useIntermediateContent = ({
  parseValue,
  onEditLayer,
  index,
}: {
  parseValue: (value: string) => LayersValue | InvalidValue;
  onEditLayer: (index: number, layers: LayersValue) => void;
  index: number;
}) => {
  const [intermediateValue, setIntermediateValue] = useState<
    IntermediateValue | InvalidValue | undefined
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
    const layers = parseValue(intermediateValue.value);
    if (layers.type === "invalid") {
      setIntermediateValue({
        type: "invalid",
        value: intermediateValue.value,
      });
      return;
    }

    onEditLayer(index, layers);
  };

  return { handleChange, handleComplete, intermediateValue };
};
