import * as React from "react";
import type { ComponentStory } from "@storybook/react";
import { GapVerticalIcon, ChevronDownIcon } from "@webstudio-is/icons";
import { Button } from "../button";
import { Flex } from "../flex";
import { DeprecatedIconButton } from "./icon-button";
import { DeprecatedTextField } from "./text-field";
import { Box } from "../box";
import { Grid } from "../grid";
import { DeprecatedText2 } from "./text2";
import { theme } from "../../stitches.config";

export default {
  component: DeprecatedTextField,
  argTypes: {
    onFocus: { action: true },
    onBlur: { action: true },
  },
};

export const Default: ComponentStory<typeof DeprecatedTextField> = () => {
  return <DeprecatedTextField />;
};

export const NativeProps: ComponentStory<typeof DeprecatedTextField> = () => {
  return (
    <Flex direction="column" gap={3}>
      <DeprecatedTextField placeholder="This is a placeholder" />
      <DeprecatedTextField
        disabled
        placeholder="This is a disabled placeholder"
      />
      <DeprecatedTextField type="number" defaultValue={25} />
      <DeprecatedTextField type="search" placeholder="This is a search input" />
      <DeprecatedTextField type="button" defaultValue={"Arial"} />
      <DeprecatedTextField readOnly value="Read-only" />
      <DeprecatedTextField disabled value="Disabled" />
    </Flex>
  );
};

export const Variants: ComponentStory<typeof DeprecatedTextField> = () => {
  return (
    <Flex direction="column" gap={3}>
      <DeprecatedTextField />
      <DeprecatedTextField variant="ghost" />
      <DeprecatedTextField type="button" />
      <DeprecatedTextField type="button" state="active" />
    </Flex>
  );
};

export const State: ComponentStory<typeof DeprecatedTextField> = () => {
  return (
    <Flex direction="column" gap={3}>
      <DeprecatedTextField />
      <DeprecatedTextField state="invalid" />
      <DeprecatedTextField state="valid" />
    </Flex>
  );
};

export const PrefixSuffix: ComponentStory<typeof DeprecatedTextField> = () => {
  return (
    <Flex direction="column" gap={3}>
      <DeprecatedTextField
        prefix={<GapVerticalIcon />}
        suffix={
          <DeprecatedIconButton>
            <ChevronDownIcon />
          </DeprecatedIconButton>
        }
      />
      <DeprecatedTextField
        state="invalid"
        prefix={<GapVerticalIcon />}
        suffix={
          <DeprecatedIconButton>
            <ChevronDownIcon />
          </DeprecatedIconButton>
        }
      />
      <DeprecatedTextField
        disabled
        prefix={<GapVerticalIcon />}
        suffix={
          <DeprecatedIconButton>
            <ChevronDownIcon />
          </DeprecatedIconButton>
        }
      />
    </Flex>
  );
};

export const Layout: ComponentStory<typeof DeprecatedTextField> = () => {
  return (
    <>
      <Flex direction="row" gap={2} css={{ justifyContent: "space-between" }}>
        <DeprecatedTextField
          value="Long content comes here and it doesn't wrap"
          prefix={<GapVerticalIcon />}
          suffix={
            <DeprecatedIconButton>
              <ChevronDownIcon />
            </DeprecatedIconButton>
          }
          css={{
            flexGrow: 1,
            maxWidth: "25%",
          }}
        />
        <Box css={{ background: theme.colors.muted }}>Content</Box>
        <DeprecatedTextField
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
        <Box css={{ background: theme.colors.muted }}>
          <DeprecatedText2 as="label" htmlFor="field">
            This is a label
          </DeprecatedText2>
        </Box>
        <Box css={{ background: theme.colors.muted }}>
          <DeprecatedTextField
            id="field"
            value="Long content comes here and it doesn't wrap"
            prefix={<GapVerticalIcon />}
          />
        </Box>
        <Box css={{ background: theme.colors.muted }}>
          <DeprecatedText2 as="label" htmlFor="field2">
            This is a label
          </DeprecatedText2>
        </Box>
        <DeprecatedTextField
          id="field2"
          value="Long content comes here and it doesn't wrap"
        />
      </Grid>
    </>
  );
};

export const Interactive: ComponentStory<typeof DeprecatedTextField> = () => {
  const [value, setValue] = React.useState("");
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <Flex direction="column" gap={3}>
      <DeprecatedTextField
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
