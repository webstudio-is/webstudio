import type { StyleValue } from "@webstudio-is/react-sdk";
import { Text } from "@webstudio-is/design-system";

export const Unit = ({ value }: { value: StyleValue }) => {
  if (value.type !== "unit" || value.unit === "number") return null;
  return (
    <Text
      css={{
        fontSize: "$1",
        cursor: "default",
      }}
    >
      {value.unit}
    </Text>
  );
};
