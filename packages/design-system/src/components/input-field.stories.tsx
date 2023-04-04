import { RowGapIcon } from "@webstudio-is/icons";
import { Flex } from "./flex";
import { InputField, inputFieldColors } from "./input-field";
import { NestedIconLabel } from "./nested-icon-label";
import { NestedSelectButton } from "./nested-select-button";
import { StorySection, StoryGrid } from "./storybook";

export default {
  title: "Library/Input Field",
};

const prefix = (
  <NestedIconLabel color="local" tabIndex={-1}>
    <RowGapIcon />
  </NestedIconLabel>
);

const suffix = <NestedSelectButton tabIndex={-1} />;

export const Demo = () => (
  <>
    <StorySection title="Basic">
      <StoryGrid horizontal>
        {inputFieldColors.map((color) => (
          <InputField key={color} defaultValue={color} color={color} />
        ))}
        <InputField defaultValue="disabled" disabled />
        <InputField placeholder="Actual placeholder" />
      </StoryGrid>
    </StorySection>

    <StorySection title="Nested Controls">
      <StoryGrid horizontal>
        {inputFieldColors.map((color) => (
          <InputField
            key={color}
            defaultValue={color}
            color={color}
            prefix={prefix}
            suffix={suffix}
          />
        ))}
        <InputField
          defaultValue="disabled"
          prefix={
            <NestedIconLabel disabled color="local">
              <RowGapIcon />
            </NestedIconLabel>
          }
          suffix={<NestedSelectButton disabled />}
          disabled
        />
      </StoryGrid>
    </StorySection>

    <StorySection title="Focused (initially)">
      <StoryGrid horizontal>
        <InputField
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
              <InputField prefix={prefix} suffix={suffix} />
            </Flex>
            <InputField prefix={prefix} suffix={suffix} css={{ width }} />
          </>
        ))}
      </StoryGrid>
    </StorySection>
  </>
);

Demo.storyName = "Input Field";
