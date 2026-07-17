import {
  Flex,
  Label,
  Radio,
  RadioGroup,
  Text,
  theme,
} from "@webstudio-is/design-system";

type DialogRadioOption<Value extends string> = {
  value: Value;
  label: string;
  description: string;
};

export const DialogRadioOptions = <Value extends string>({
  value,
  options,
  onValueChange,
}: {
  value: Value;
  options: ReadonlyArray<DialogRadioOption<Value>>;
  onValueChange: (value: Value) => void;
}) => (
  <RadioGroup
    value={value}
    onValueChange={(nextValue) => onValueChange(nextValue as Value)}
  >
    <Flex direction="column" gap="1">
      {options.map((option) => (
        <Label key={option.value}>
          <Flex
            gap="2"
            css={{
              padding: theme.spacing[3],
              cursor: "pointer",
              borderRadius: theme.borderRadius[4],
              "&:hover": {
                backgroundColor: theme.colors.backgroundHover,
              },
            }}
          >
            <Radio value={option.value} />
            <Flex direction="column" gap="1">
              <Text variant="labels">{option.label}</Text>
              <Text color="subtle">{option.description}</Text>
            </Flex>
          </Flex>
        </Label>
      ))}
    </Flex>
  </RadioGroup>
);
