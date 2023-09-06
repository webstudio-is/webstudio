import type { InvalidValue, LayersValue } from "@webstudio-is/css-engine";
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
import type { RenderCategoryProps } from "../../style-sections";

type IntermediateValue = {
  type: "intermediate";
  value: string;
};

const useContent = ({
  onEditLayer,
  index,
}: {
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
    const layers = parseBoxShadow(intermediateValue.value);
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

type BoxShadowContentProps = {
  index: number;
  value: string;
  onEditLayer: (index: number, layers: LayersValue) => void;
  createBatchUpdate: RenderCategoryProps["createBatchUpdate"];
};

export const BoxShadowContent = (props: BoxShadowContentProps) => {
  const { intermediateValue, handleChange, handleComplete } = useContent(props);
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
