import type { LayersValue } from "@webstudio-is/css-engine";
import {
  Flex,
  Label,
  TextArea,
  theme,
  textVariants,
} from "@webstudio-is/design-system";
import type { CreateBatchUpdate } from "../../shared/use-style-data";
import { useIntermediateContent } from "../../shared/use-intermediate-layer";
import { parseTransition } from "@webstudio-is/css-data";

type TransitionContentProps = {
  index: number;
  value: string;
  onEditLayer: (index: number, layer: LayersValue) => void;
  createBatchUpdate: CreateBatchUpdate;
};

export const TransitionContent = (props: TransitionContentProps) => {
  const { intermediateValue, handleChange, handleComplete } =
    useIntermediateContent({ ...props, parseValue: parseTransition });

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
