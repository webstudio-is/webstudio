import { GapVerticalIcon } from "@webstudio-is/icons";
import { Flex } from "./flex";
import {
  InputField as InputFieldComponent,
  inputFieldColors,
} from "./input-field";
import { NestedIconLabel } from "./nested-icon-label";
import { NestedInputButton } from "./nested-input-button";
import { StorySection, StoryGrid } from "./storybook";

export default {
  title: "Input Field",
};

const prefix = (
  <NestedIconLabel color="local" tabIndex={-1}>
    <GapVerticalIcon />
  </NestedIconLabel>
);

const suffix = <NestedInputButton tabIndex={-1} />;

export const InputField = () => (
  <>
    <StorySection title="Basic">
      <StoryGrid horizontal>
        {inputFieldColors.map((color) => (
          <InputFieldComponent key={color} defaultValue={color} color={color} />
        ))}
        <InputFieldComponent defaultValue="disabled" disabled />
        <InputFieldComponent placeholder="Actual placeholder" />
      </StoryGrid>
    </StorySection>

    <StorySection title="Mono">
      <StoryGrid horizontal>
        <InputFieldComponent defaultValue="mono text" text="mono" />
      </StoryGrid>
    </StorySection>

    <StorySection title="Nested Controls">
      <StoryGrid horizontal>
        {inputFieldColors.map((color) => (
          <InputFieldComponent
            key={color}
            defaultValue={color}
            color={color}
            prefix={prefix}
            suffix={suffix}
          />
        ))}
        <InputFieldComponent
          defaultValue="disabled"
          prefix={
            <NestedIconLabel disabled color="local">
              <GapVerticalIcon />
            </NestedIconLabel>
          }
          suffix={<NestedInputButton disabled />}
          disabled
        />
      </StoryGrid>
    </StorySection>

    <StorySection title="Focused (initially)">
      <StoryGrid horizontal>
        <InputFieldComponent
          defaultValue="Some value"
          prefix={prefix}
          suffix={suffix}
          autoFocus
        />
      </StoryGrid>
    </StorySection>

    <StorySection title="Width text">
      <StoryGrid>
        {[300, 100].map((width) => (
          <>
            <Flex css={{ width, background: "black", height: 4 }} />
            <Flex
              css={{ width, justifyItems: "stretch", flexDirection: "column" }}
            >
              <InputFieldComponent prefix={prefix} suffix={suffix} />
            </Flex>
            <InputFieldComponent
              prefix={prefix}
              suffix={suffix}
              css={{ width }}
            />
          </>
        ))}
      </StoryGrid>
    </StorySection>

    <StorySection title="Chromeless variant">
      <StoryGrid horizontal>
        <InputFieldComponent defaultValue="Chromeless" variant="chromeless" />
        <InputFieldComponent
          defaultValue="With prefix"
          variant="chromeless"
          prefix={prefix}
          suffix={suffix}
        />
      </StoryGrid>
    </StorySection>

    <StorySection title="Small size (size 1)">
      <StoryGrid horizontal>
        <InputFieldComponent defaultValue="Size 1" size="1" />
        <InputFieldComponent defaultValue="Size 2" size="2" />
        <InputFieldComponent
          defaultValue="Size 1 with prefix"
          size="1"
          prefix={prefix}
          suffix={suffix}
        />
      </StoryGrid>
    </StorySection>

    <StorySection title="Input types">
      <StoryGrid horizontal>
        <InputFieldComponent type="number" defaultValue="42" />
        <InputFieldComponent type="password" defaultValue="secret" />
        <InputFieldComponent type="email" placeholder="email@example.com" />
        <InputFieldComponent type="url" placeholder="https://…" />
        <InputFieldComponent type="tel" placeholder="+1 555 0100" />
      </StoryGrid>
    </StorySection>

    <StorySection title="Field sizing content">
      <StoryGrid horizontal>
        <InputFieldComponent defaultValue="Content" fieldSizing="content" />
        <InputFieldComponent defaultValue="Fixed" fieldSizing="fixed" />
      </StoryGrid>
    </StorySection>
  </>
);
