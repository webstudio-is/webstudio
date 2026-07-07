import { Flex, StorySection, Text, theme } from "@webstudio-is/design-system";
import { BooleanControl } from "./boolean";
import { NumberControl } from "./number";
import { TextControl } from "./text";
import { SelectControl } from "./select";
import { CheckControl } from "./check";
import { RadioControl } from "./radio";

export default {
  title: "Builder/Settings panel/Controls",
};

const Section = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <Flex direction="column" gap="2">
    <Text
      variant="labels"
      css={{
        paddingBottom: theme.spacing[3],
        borderBottom: `1px solid ${theme.colors.borderMain}`,
      }}
    >
      {label}
    </Text>
    {children}
  </Flex>
);

const noop = () => {};

export const Controls = () => (
  <StorySection title="Controls">
    <Flex
      direction="column"
      gap="5"
      css={{ width: theme.sizes.sidebarWidth, padding: theme.spacing[5] }}
    >
      <Section label="Boolean">
        <BooleanControl
          instanceId="inst-1"
          meta={{
            type: "boolean",
            control: "boolean",
            required: false,
            defaultValue: false,
          }}
          prop={undefined}
          propName="disabled"
          computedValue={false}
          onChange={noop}
        />
        <BooleanControl
          instanceId="inst-1"
          meta={{
            type: "boolean",
            control: "boolean",
            required: false,
            defaultValue: true,
          }}
          prop={{
            id: "p-1",
            instanceId: "inst-1",
            name: "checked",
            type: "boolean",
            value: true,
          }}
          propName="checked"
          computedValue={true}
          onChange={noop}
        />
      </Section>

      <Section label="Number">
        <NumberControl
          instanceId="inst-1"
          meta={{ type: "number", control: "number", required: false }}
          prop={undefined}
          propName="tabIndex"
          computedValue={0}
          onChange={noop}
        />
        <NumberControl
          instanceId="inst-1"
          meta={{ type: "number", control: "number", required: false }}
          prop={{
            id: "p-2",
            instanceId: "inst-1",
            name: "maxLength",
            type: "number",
            value: 100,
          }}
          propName="maxLength"
          computedValue={100}
          onChange={noop}
        />
      </Section>

      <Section label="Text">
        <TextControl
          instanceId="inst-1"
          meta={{ type: "string", control: "text", required: false, rows: 1 }}
          prop={undefined}
          propName="placeholder"
          computedValue=""
          onChange={noop}
        />
        <TextControl
          instanceId="inst-1"
          meta={{ type: "string", control: "text", required: false, rows: 3 }}
          prop={{
            id: "p-3",
            instanceId: "inst-1",
            name: "alt",
            type: "string",
            value: "A scenic mountain view at sunset",
          }}
          propName="alt"
          computedValue="A scenic mountain view at sunset"
          onChange={noop}
        />
      </Section>

      <Section label="Select">
        <SelectControl
          instanceId="inst-1"
          meta={{
            type: "string",
            control: "select",
            required: false,
            options: ["auto", "eager", "lazy"],
          }}
          prop={undefined}
          propName="loading"
          computedValue="lazy"
          onChange={noop}
        />
      </Section>

      <Section label="Check (multi-select)">
        <CheckControl
          instanceId="inst-1"
          meta={{
            type: "string[]",
            control: "check",
            required: false,
            options: ["nofollow", "noopener", "noreferrer"],
          }}
          prop={undefined}
          propName="rel"
          computedValue={["noopener", "noreferrer"]}
          onChange={noop}
        />
      </Section>

      <Section label="Radio">
        <RadioControl
          instanceId="inst-1"
          meta={{
            type: "string",
            control: "radio",
            required: false,
            options: ["_self", "_blank", "_parent"],
          }}
          prop={undefined}
          propName="target"
          computedValue="_self"
          onChange={noop}
        />
      </Section>
    </Flex>
  </StorySection>
);
