import {
  parseLinearGradient,
  reconstructLinearGradient,
  type ParsedGradient,
} from "@webstudio-is/css-data";
import { useState } from "react";
import { GradientPicker } from "./gradient-picker";
import { Flex } from "./flex";
import { Text } from "./text";

export default {
  title: "Library/GradientPicker",
};

export const GradientWithoutAngle = () => {
  const gradientString = "linear-gradient(black 0%, white 100%)";
  const [gradient, setGradient] = useState<string>(gradientString);

  return (
    <Flex direction="column" gap="4">
      <GradientPicker
        gradient={parseLinearGradient(gradientString) as ParsedGradient}
        onChange={(value) => {
          setGradient(reconstructLinearGradient(value));
        }}
        onThumbSelected={() => {}}
      />
      <Text>{gradient}</Text>
    </Flex>
  );
};

export const GradientWithAngleAndHints = () => {
  const gradientString =
    "linear-gradient(145deg, #ff00fa 0%, #00f497 34% 34%, #ffa800 56% 56%, #00eaff 100%)";
  const [gradient, setGradient] = useState<string>(gradientString);

  return (
    <Flex direction="column" gap="4">
      <GradientPicker
        gradient={parseLinearGradient(gradientString) as ParsedGradient}
        onChange={(value) => {
          setGradient(reconstructLinearGradient(value));
        }}
        onThumbSelected={() => {}}
      />
      <Text>{gradient}</Text>
    </Flex>
  );
};

export const GradientWithSideOrCorner = () => {
  const gradientString = "linear-gradient(to left top, blue 0%, red 100%)";
  const [gradient, setGradient] = useState<string>(gradientString);

  return (
    <Flex direction="column" gap="4">
      <GradientPicker
        gradient={parseLinearGradient(gradientString) as ParsedGradient}
        onChange={(value) => {
          setGradient(reconstructLinearGradient(value));
        }}
        onThumbSelected={() => {}}
      />
      <Text>{gradient}</Text>
    </Flex>
  );
};
