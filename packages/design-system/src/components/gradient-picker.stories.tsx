import {
  parseLinearGradient,
  formatLinearGradient,
  type ParsedLinearGradient,
} from "@webstudio-is/css-data";
import { useState } from "react";
import { GradientPicker } from "./gradient-picker";
import { Flex } from "./flex";
import { Text } from "./text";

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

export const GradientWithoutAngle = () => {
  const gradientString = "linear-gradient(90deg, black 0%, white 100%)";
  const [gradient, setGradient] = useState<ParsedLinearGradient>(() =>
    parseLinearGradientOrThrow(gradientString)
  );

  return (
    <Flex direction="column" gap="4">
      <GradientPicker
        gradient={gradient}
        backgroundImage={formatLinearGradient(gradient)}
        onChange={(value) => {
          setGradient(value);
        }}
        onChangeComplete={(value) => {
          setGradient(value);
        }}
        onThumbSelect={() => {}}
      />
      <Text>{formatLinearGradient(gradient)}</Text>
    </Flex>
  );
};

export const GradientWithAngleAndHints = () => {
  const gradientString =
    "linear-gradient(145deg, #ff00fa 0%, #00f497 34% 34%, #ffa800 56% 56%, #00eaff 100%)";
  const [gradient, setGradient] = useState<ParsedLinearGradient>(() =>
    parseLinearGradientOrThrow(gradientString)
  );

  return (
    <Flex direction="column" gap="4">
      <GradientPicker
        gradient={gradient}
        backgroundImage={formatLinearGradient(gradient)}
        onChange={(value) => {
          setGradient(value);
        }}
        onChangeComplete={(value) => {
          setGradient(value);
        }}
        onThumbSelect={() => {}}
      />
      <Text>{formatLinearGradient(gradient)}</Text>
    </Flex>
  );
};

export const GradientWithSideOrCorner = () => {
  const gradientString = "linear-gradient(to left top, blue 0%, red 100%)";
  const [gradient, setGradient] = useState<ParsedLinearGradient>(() =>
    parseLinearGradientOrThrow(gradientString)
  );

  return (
    <Flex direction="column" gap="4">
      <GradientPicker
        gradient={gradient}
        backgroundImage={formatLinearGradient(gradient)}
        onChange={(value) => {
          setGradient(value);
        }}
        onChangeComplete={(value) => {
          setGradient(value);
        }}
        onThumbSelect={() => {}}
      />
      <Text>{formatLinearGradient(gradient)}</Text>
    </Flex>
  );
};
