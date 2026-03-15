import type { StoryFn } from "@storybook/react";
import { XIcon } from "@webstudio-is/icons";
import { Flex } from "./flex";
import { IconButton as IconButtonComponent } from "./icon-button";

export default {
  title: "Icon button",
  component: IconButtonComponent,
};

export const IconButton: StoryFn<typeof IconButtonComponent> = () => {
  return (
    <Flex direction="column" gap={2}>
      <Flex gap={2}>
        <IconButtonComponent>
          <XIcon fill="currentColor" />
        </IconButtonComponent>
        <IconButtonComponent variant="preset">
          <XIcon fill="currentColor" />
        </IconButtonComponent>
        <IconButtonComponent variant="local">
          <XIcon fill="currentColor" />
        </IconButtonComponent>
        <IconButtonComponent variant="overwritten">
          <XIcon fill="currentColor" />
        </IconButtonComponent>
        <IconButtonComponent variant="remote">
          <XIcon fill="currentColor" />
        </IconButtonComponent>
      </Flex>
      <Flex gap={2}>
        <IconButtonComponent disabled={true}>
          <XIcon fill="currentColor" />
        </IconButtonComponent>
        <IconButtonComponent variant="preset" disabled={true}>
          <XIcon fill="currentColor" />
        </IconButtonComponent>
        <IconButtonComponent variant="local" disabled={true}>
          <XIcon fill="currentColor" />
        </IconButtonComponent>
        <IconButtonComponent variant="overwritten" disabled={true}>
          <XIcon fill="currentColor" />
        </IconButtonComponent>
        <IconButtonComponent variant="remote" disabled={true}>
          <XIcon fill="currentColor" />
        </IconButtonComponent>
      </Flex>
      <Flex gap={2}>
        <IconButtonComponent data-state={"open"}>
          <XIcon fill="currentColor" />
        </IconButtonComponent>
        <IconButtonComponent variant="preset" data-state={"open"}>
          <XIcon fill="currentColor" />
        </IconButtonComponent>
        <IconButtonComponent variant="local" data-state={"open"}>
          <XIcon fill="currentColor" />
        </IconButtonComponent>
        <IconButtonComponent variant="overwritten" data-state={"open"}>
          <XIcon fill="currentColor" />
        </IconButtonComponent>
        <IconButtonComponent variant="remote" data-state={"open"}>
          <XIcon fill="currentColor" />
        </IconButtonComponent>
      </Flex>
      <Flex gap={2}>
        <IconButtonComponent data-focused={true}>
          <XIcon fill="currentColor" />
        </IconButtonComponent>
        <IconButtonComponent variant="preset" data-focused={true}>
          <XIcon fill="currentColor" />
        </IconButtonComponent>
        <IconButtonComponent variant="local" data-focused={true}>
          <XIcon fill="currentColor" />
        </IconButtonComponent>
        <IconButtonComponent variant="overwritten" data-focused={true}>
          <XIcon fill="currentColor" />
        </IconButtonComponent>
        <IconButtonComponent variant="remote" data-focused={true}>
          <XIcon fill="currentColor" />
        </IconButtonComponent>
      </Flex>
    </Flex>
  );
};

export const Hovered = () => (
  <Flex gap={2}>
    <IconButtonComponent data-hovered={true}>
      <XIcon fill="currentColor" />
    </IconButtonComponent>
    <IconButtonComponent variant="preset" data-hovered={true}>
      <XIcon fill="currentColor" />
    </IconButtonComponent>
    <IconButtonComponent variant="local" data-hovered={true}>
      <XIcon fill="currentColor" />
    </IconButtonComponent>
    <IconButtonComponent variant="overwritten" data-hovered={true}>
      <XIcon fill="currentColor" />
    </IconButtonComponent>
    <IconButtonComponent variant="remote" data-hovered={true}>
      <XIcon fill="currentColor" />
    </IconButtonComponent>
  </Flex>
);
