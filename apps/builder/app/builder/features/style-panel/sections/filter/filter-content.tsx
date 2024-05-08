import type {
  InvalidValue,
  LayersValue,
  StyleProperty,
  TupleValue,
} from "@webstudio-is/css-engine";
import {
  Flex,
  theme,
  Label,
  TextArea,
  textVariants,
} from "@webstudio-is/design-system";
import { useState } from "react";
import type { IntermediateStyleValue } from "../../shared/css-value-input";
import { parseFilter } from "@webstudio-is/css-data";
import type { DeleteProperty } from "../../shared/use-style-data";

type FilterContentProps = {
  index: number;
  filter: string;
  property: StyleProperty;
  onEditLayer: (index: number, layers: LayersValue | TupleValue) => void;
  deleteProperty: DeleteProperty;
  tooltip: JSX.Element;
};

export const FilterSectionContent = ({
  index,
  filter,
  property,
  onEditLayer,
  deleteProperty,
  tooltip,
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
          {tooltip}
        </Flex>
      </Label>
      {
        // @todo Replace the TextArea with code-editor.
        // For more details, please refer to the issue
        // https://github.com/webstudio-is/webstudio/issues/2977
      }
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
            // On pressing Enter, the textarea is creating a new line.
            // In-order to prevent it and update the content.
            // We prevent the default behaviour
            event.preventDefault();
          }

          if (event.key === "Escape") {
            if (intermediateValue === undefined) {
              return;
            }

            deleteProperty(property, { isEphemeral: true });
            setIntermediateValue(undefined);
            event.preventDefault();
          }
        }}
      />
    </Flex>
  );
};
