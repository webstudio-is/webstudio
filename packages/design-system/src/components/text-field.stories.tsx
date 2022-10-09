import { expect } from "@storybook/jest";
import { userEvent, waitFor, within } from "@storybook/testing-library";
import React from "react";
import { ComponentStory } from "@storybook/react";
import { RowGapIcon, ChevronDownIcon } from "@webstudio-is/icons";
import { Button } from "./button";
import { Flex } from "./flex";
import { IconButton } from "./icon-button";
import { TextField } from "./text-field";
import { Box } from "./box";
import { Grid } from "./grid";
import { Text } from "./text";

export default {
  component: TextField,
  argTypes: {
    onFocus: { action: true },
    onBlur: { action: true },
  },
};

export const Default: ComponentStory<typeof TextField> = () => {
  return <TextField />;
};

export const NativeProps: ComponentStory<typeof TextField> = () => {
  return (
    <Flex direction="column" gap={3}>
      <TextField placeholder="This is a placeholder" />
      <TextField disabled placeholder="This is a disabled placeholder" />
      <TextField type="number" defaultValue={25} />
      <TextField type="search" placeholder="This is a search input" />
      <TextField readOnly value="Read-only" />
      <TextField disabled value="Disabled" />
    </Flex>
  );
};

export const Variants: ComponentStory<typeof TextField> = () => {
  return (
    <Flex direction="column" gap={3}>
      <TextField />
      <TextField variant="ghost" />
    </Flex>
  );
};

export const State: ComponentStory<typeof TextField> = () => {
  return (
    <Flex direction="column" gap={3}>
      <TextField />
      <TextField state="invalid" />
      <TextField state="valid" />
    </Flex>
  );
};

export const PrefixSuffix: ComponentStory<typeof TextField> = () => {
  return (
    <Flex direction="column" gap={3}>
      <TextField
        prefix={<RowGapIcon />}
        suffix={
          <IconButton>
            <ChevronDownIcon />
          </IconButton>
        }
      />
      <TextField
        state="invalid"
        prefix={<RowGapIcon />}
        suffix={
          <IconButton>
            <ChevronDownIcon />
          </IconButton>
        }
      />
      <TextField
        disabled
        prefix={<RowGapIcon />}
        suffix={
          <IconButton>
            <ChevronDownIcon />
          </IconButton>
        }
      />
    </Flex>
  );
};

export const Layout: ComponentStory<typeof TextField> = () => {
  return (
    <>
      <Flex direction="row" gap={2} css={{ justifyContent: "space-between" }}>
        <TextField
          value="Long content comes here and it doesn't wrap"
          prefix={<RowGapIcon />}
          suffix={
            <IconButton>
              <ChevronDownIcon />
            </IconButton>
          }
          css={{
            flexGrow: 1,
            maxWidth: "25%",
          }}
        />
        <Box css={{ background: "$muted" }}>Content</Box>
        <TextField
          state="invalid"
          value="Long content comes here and it doesn't wrap"
        />
      </Flex>

      <Grid
        gap={2}
        css={{
          gridTemplateColumns: "100px 1fr",
          width: 250,
          border: "1px solid",
        }}
      >
        <Box css={{ background: "$muted" }}>
          <Text as="label" htmlFor="field">
            This is a label
          </Text>
        </Box>
        <Box css={{ background: "$muted" }}>
          <TextField
            id="field"
            value="Long content comes here and it doesn't wrap"
            prefix={<RowGapIcon />}
          />
        </Box>
        <Box css={{ background: "$muted" }}>
          <Text as="label" htmlFor="field2">
            This is a label
          </Text>
        </Box>
        <TextField
          id="field2"
          value="Long content comes here and it doesn't wrap"
        />
      </Grid>
    </>
  );
};

export const Interactive: ComponentStory<typeof TextField> = () => {
  const [value, setValue] = React.useState("");
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <Flex direction="column" gap={3}>
      <TextField ref={wrapperRef} inputRef={inputRef} value={value} readOnly />
      <Button
        onClick={() => {
          // eslint-disable-next-line no-console
          setValue(JSON.stringify(wrapperRef.current?.getBoundingClientRect()));
        }}
      >
        Measure TextField
      </Button>
      <Button
        onClick={() => {
          inputRef.current?.focus();
        }}
      >
        Focus TextField
      </Button>
    </Flex>
  );
};

export const FocusEvents: ComponentStory<typeof TextField> = (args) => {
  return (
    <label>
      Focus and blur:
      <TextField name="focus" suffix={<Button>test</Button>} {...args} />
    </label>
  );
};
FocusEvents.play = async ({ args, canvasElement }) => {
  const canvas = within(canvasElement);

  const el = canvas.getByLabelText("Focus and blur:");

  await userEvent.tab();
  await waitFor(() => expect(el).toHaveFocus());
  await userEvent.tab();
  await waitFor(() => expect(args.onBlur).not.toHaveBeenCalled());
  await userEvent.tab();
  await waitFor(() => expect(args.onBlur).toHaveBeenCalled());

  await waitFor(() => expect(args.onFocus).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(args.onBlur).toHaveBeenCalledTimes(1));
};

export const ClickCapture: ComponentStory<typeof TextField> = (args) => {
  return (
    <TextField
      name="click"
      placeholder="Click on the icon to focus input"
      prefix={
        <Flex title="icon">
          <RowGapIcon />
        </Flex>
      }
      suffix={
        <IconButton>
          <ChevronDownIcon />
        </IconButton>
      }
      {...args}
    />
  );
};
ClickCapture.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const input = canvas.getByPlaceholderText("Click on the icon to focus input");
  await userEvent.click(canvas.getByTitle("icon"));
  await waitFor(() => expect(input).toHaveFocus());
  await userEvent.click(canvas.getByRole("button"));
  await waitFor(() => expect(input).toHaveFocus());
};
