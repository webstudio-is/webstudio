import React from "react";
import { ComponentStory } from "@storybook/react";
import { Button } from "./button";
import { Flex } from "./flex";
import { TextAreaField } from "./text-area-field";

export default {
  component: TextAreaField,
  argTypes: {
    onFocus: { action: true },
    onBlur: { action: true },
  },
};

export const Default: ComponentStory<typeof TextAreaField> = () => {
  return <TextAreaField />;
};

export const NativeProps: ComponentStory<typeof TextAreaField> = () => {
  return (
    <Flex direction="column" gap={3}>
      <TextAreaField placeholder="This is a placeholder" />
      <TextAreaField disabled placeholder="This is a disabled placeholder" />
      <TextAreaField readOnly value="Read-only" />
      <TextAreaField disabled value="Disabled" />
    </Flex>
  );
};

export const Variants: ComponentStory<typeof TextAreaField> = () => {
  return (
    <Flex direction="column" gap={3}>
      <TextAreaField />
      <TextAreaField variant="ghost" />
    </Flex>
  );
};

export const State: ComponentStory<typeof TextAreaField> = () => {
  return (
    <Flex direction="column" gap={3}>
      <TextAreaField />
      <TextAreaField state="invalid" />
      <TextAreaField state="valid" />
    </Flex>
  );
};

export const Interactive: ComponentStory<typeof TextAreaField> = () => {
  const [value, setValue] = React.useState("");
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  return (
    <Flex direction="column" gap={3}>
      <TextAreaField
        ref={wrapperRef}
        inputRef={inputRef}
        value={value}
        readOnly
      />
      <Button
        onClick={() => {
          // eslint-disable-next-line no-console
          setValue(JSON.stringify(wrapperRef.current?.getBoundingClientRect()));
        }}
      >
        Measure TextAreaField
      </Button>
      <Button
        onClick={() => {
          inputRef.current?.focus();
        }}
      >
        Focus TextAreaField
      </Button>
    </Flex>
  );
};
