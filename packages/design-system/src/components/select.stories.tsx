import { GapVerticalIcon } from "@webstudio-is/icons";
import { useState } from "react";
import { NestedIconLabel } from "./nested-icon-label";
import { Select as SelectComponent, type SelectOption } from "./select";
import { Flex } from "./flex";
import { Text } from "./text";
import { StorySection } from "./storybook";

export default {
  title: "Select",
  component: SelectComponent,
};

const fruits = ["Apple", "Banana", "Orange"];

const emojiItems = {
  apple: { icon: "🍎" },
  banana: { icon: "🍌" },
  orange: { icon: "🍊" },
  pear: { icon: "🍐" },
  grape: { icon: "🍇" },
} as const;

const descriptionOptions = [
  { label: "Apple", description: "An apple fruit" },
  { label: "Banana", description: "A banana fruit" },
  {
    label: "Orange",
    description:
      "An orange fruit An orange fruit An orange fruit An orange fruit",
  },
  { label: "Pear", description: "A pear fruit" },
  { label: "Grape", description: "A grape fruit" },
];

export const Select = () => {
  const [simple, setSimple] = useState(fruits[0]);
  const emojiOptions = Object.keys(emojiItems);
  const [emoji, setEmoji] = useState(emojiOptions[0]);
  const [desc, setDesc] = useState<(typeof descriptionOptions)[number]>(
    descriptionOptions[0]
  );
  const manyItems = Array(100)
    .fill(0)
    .map((_, i) => `Item ${i}`);
  const [boundary, setBoundary] = useState(manyItems[0]);

  const getEmojiLabel = (option: SelectOption) =>
    emoji && option in emojiItems
      ? `${emojiItems[option as keyof typeof emojiItems]?.icon} ${option}`
      : "No fruit selected";

  return (
    <StorySection title="Select">
      <Flex direction="column" gap="5" css={{ maxWidth: 300 }}>
        <Flex direction="column" gap="1">
          <Text variant="labels">Simple</Text>
          <SelectComponent
            name="fruit"
            options={fruits}
            value={simple}
            onChange={setSimple}
          />
        </Flex>
        <Flex direction="column" gap="1">
          <Text variant="labels">Placeholder</Text>
          <SelectComponent placeholder="Select fruit" options={fruits} />
        </Flex>
        <Flex direction="column" gap="1">
          <Text variant="labels">Disabled</Text>
          <SelectComponent disabled options={fruits} />
        </Flex>
        <Flex direction="column" gap="1">
          <Text variant="labels">Full width</Text>
          <SelectComponent
            name="fruit"
            options={["Apple", "Banana", "Orange Orange Orange Orange Orange"]}
            defaultValue="Apple"
            fullWidth
          />
        </Flex>
        <Flex direction="column" gap="1">
          <Text variant="labels">With icon prefix</Text>
          <SelectComponent
            prefix={
              <NestedIconLabel>
                <GapVerticalIcon />
              </NestedIconLabel>
            }
            name="fruit"
            options={fruits}
            defaultValue="Apple"
          />
        </Flex>
        <Flex direction="column" gap="1">
          <Text variant="labels">Complex items (emoji)</Text>
          <SelectComponent
            name="fruit"
            options={emojiOptions}
            value={emoji}
            onChange={setEmoji}
            getLabel={getEmojiLabel}
          />
        </Flex>
        <Flex direction="column" gap="1">
          <Text variant="labels">With descriptions</Text>
          <SelectComponent
            name="fruit"
            options={descriptionOptions}
            value={desc}
            getValue={(v) => v.label}
            onChange={setDesc}
            getLabel={(o) => o.label}
            getDescription={(o) => (
              <div style={{ width: 150 }}>{o.description}</div>
            )}
          />
        </Flex>
        <Flex direction="column" gap="1">
          <Text variant="labels">Many items (100)</Text>
          <SelectComponent
            name="fruit"
            options={manyItems}
            value={boundary}
            onChange={setBoundary}
          />
        </Flex>
      </Flex>
    </StorySection>
  );
};

export const WithItemHighlight = () => {
  const [value, setValue] = useState(fruits[0]);
  const [highlighted, setHighlighted] = useState<string | undefined>();
  return (
    <StorySection title="With item highlight">
      <Flex direction="column" gap="2" style={{ maxWidth: 300 }}>
        <Text variant="labels">Highlighted: {highlighted ?? "none"}</Text>
        <SelectComponent
          options={fruits}
          value={value}
          onChange={setValue}
          onItemHighlight={setHighlighted}
        />
      </Flex>
    </StorySection>
  );
};

export const ControlledOpen = () => {
  const [open, setOpen] = useState(false);
  return (
    <StorySection title="Controlled open">
      <Flex direction="column" gap="2" style={{ maxWidth: 300 }}>
        <Text variant="labels">Open: {String(open)}</Text>
        <SelectComponent
          options={fruits}
          defaultValue="Apple"
          open={open}
          onOpenChange={setOpen}
        />
      </Flex>
    </StorySection>
  );
};
