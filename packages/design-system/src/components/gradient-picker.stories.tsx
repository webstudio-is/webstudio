import {
  parseLinearGradient,
  formatLinearGradient,
  type ParsedLinearGradient,
} from "@webstudio-is/css-data";
import { useState } from "react";
import { GradientPicker as GradientPickerComponent } from "./gradient-picker";
import { Flex } from "./flex";
import { Text } from "./text";
import { StorySection } from "./storybook";

export default {
  title: "Gradient Picker",
};

const parseLinearGradientOrThrow = (
  gradientString: string
): ParsedLinearGradient => {
  const parsed = parseLinearGradient(gradientString);
  if (parsed === undefined) {
    throw new Error(`Invalid gradient: ${gradientString}`);
  }
  return parsed;
};

const GradientVariant = ({
  label,
  initial,
}: {
  label: string;
  initial: string;
}) => {
  const [gradient, setGradient] = useState<ParsedLinearGradient>(() =>
    parseLinearGradientOrThrow(initial)
  );
  return (
    <Flex direction="column" gap="2">
      <Text variant="labels">{label}</Text>
      <GradientPickerComponent
        gradient={gradient}
        backgroundImage={formatLinearGradient(gradient)}
        onChange={setGradient}
        onChangeComplete={setGradient}
        onThumbSelect={() => {}}
      />
      <Text>{formatLinearGradient(gradient)}</Text>
    </Flex>
  );
};

export const GradientPicker = () => {
  const [gradient, setGradient] = useState<ParsedLinearGradient>(() =>
    parseLinearGradientOrThrow(
      "linear-gradient(90deg, red 0%, green 50%, blue 100%)"
    )
  );
  return (
    <>
      <StorySection title="Variants">
        <Flex direction="column" gap="6">
          <GradientVariant
            label="Simple (90deg)"
            initial="linear-gradient(90deg, black 0%, white 100%)"
          />
          <GradientVariant
            label="Angle + Hints"
            initial="linear-gradient(145deg, #ff00fa 0%, #00f497 34% 34%, #ffa800 56% 56%, #00eaff 100%)"
          />
          <GradientVariant
            label="Side or Corner"
            initial="linear-gradient(to left top, blue 0%, red 100%)"
          />
        </Flex>
      </StorySection>

      <StorySection title="With selected stop">
        <Flex direction="column" gap="2">
          <Text variant="labels">Pre-selected middle stop (index 1)</Text>
          <GradientPickerComponent
            gradient={gradient}
            backgroundImage={formatLinearGradient(gradient)}
            onChange={setGradient}
            onChangeComplete={setGradient}
            onThumbSelect={() => {}}
            selectedStopIndex={1}
          />
          <Text>{formatLinearGradient(gradient)}</Text>
        </Flex>
      </StorySection>
    </>
  );
};
