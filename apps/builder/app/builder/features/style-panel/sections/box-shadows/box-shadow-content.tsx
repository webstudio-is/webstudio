import type { InvalidValue, LayersValue } from "@webstudio-is/css-data";
import { parseBoxShadow } from "@webstudio-is/css-data";
import {
  Flex,
  Label,
  Text,
  TextArea,
  theme,
  Tooltip,
} from "@webstudio-is/design-system";
import { InformationIcon } from "@webstudio-is/icons";
import { useState } from "react";
import type { RenderCategoryProps } from "../../style-sections";
import { addBoxShadow } from "./utils";

type IntermediateValue = {
  type: "intermediate";
  value: string;
};

type BoxShadowEditProps = Pick<RenderCategoryProps, "createBatchUpdate"> & {
  index: number;
  value: string;
  onEditLayer: (index: number, layers: LayersValue) => void;
};

type BoxShadowContentProps = Pick<RenderCategoryProps, "createBatchUpdate">;

export const BoxShadowContent = (
  props: BoxShadowContentProps | BoxShadowEditProps
) => {
  const [intermediateValue, setIntermediateValue] = useState<
    IntermediateValue | InvalidValue | undefined
  >(
    "onEditLayer" in props
      ? {
          type: "intermediate",
          value: props.value,
        }
      : undefined
  );

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

    if ("onEditLayer" in props) {
      props.onEditLayer(props.index, layers);
    } else {
      addBoxShadow(layers, props.createBatchUpdate);
    }
  };

  return (
    <Flex
      direction="column"
      css={{
        px: theme.spacing[9],
        py: theme.spacing[9],
        gap: theme.spacing[3],
      }}
    >
      <Label>
        <Flex align={"center"} gap={2}>
          Code
          <Tooltip
            variant="wrapped"
            content={
              <Text variant="labelsTitleCase">
                Paste a box-shadow, for example:
                <br />
                <br />
                box-shadow(...)
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
        value={intermediateValue?.value ?? ""}
        css={{ minHeight: theme.spacing[14] }}
        state={intermediateValue?.type === "invalid" ? "invalid" : undefined}
        onChange={(event) => handleChange(event.target.value)}
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
