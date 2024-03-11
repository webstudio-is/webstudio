import type { InvalidValue, LayersValue } from "@webstudio-is/css-engine";
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
  filter: string;
  onEditLayer: (index: number, layers: LayersValue) => void;
  deleteProperty: DeleteProperty;
};

export const FilterSectionContent = ({
  index,
  filter,
  onEditLayer,
  deleteProperty,
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
        onBlur={handleComplete}
        onKeyDown={(event) => {
          event.stopPropagation();

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

            deleteProperty("filter", { isEphemeral: true });
            setIntermediateValue(undefined);
            event.preventDefault();
          }
        }}
      />
    </Flex>
  );
};
