import { useStore } from "@nanostores/react";
import { pagesStore } from "~/shared/nano-states";
import {
  DeprecatedTextField,
  Flex,
  theme,
  useId,
  ToggleGroup,
  ToggleGroupItem,
  Select,
  Tooltip,
} from "@webstudio-is/design-system";
import { LinkIcon, PageIcon } from "@webstudio-is/icons";
import { useState } from "react";
import {
  type ControlProps,
  getLabel,
  useLocalValue,
  VerticalLayout,
} from "../shared";
import type { Page } from "@webstudio-is/project-build";

type UrlControlProps = ControlProps<"url", "string" | "page">;

type BaseControlProps = {
  id: string;
  prop: UrlControlProps["prop"];
  onChange: UrlControlProps["onChange"];
};

const BaseUrl = ({ prop, onChange, id }: BaseControlProps) => {
  const localValue = useLocalValue(
    prop?.type === "string" ? prop.value : "",
    (value) => onChange({ type: "string", value })
  );

  return (
    <Flex css={{ py: theme.spacing[2] }} direction="column" align="stretch">
      <DeprecatedTextField
        id={id}
        value={localValue.value}
        placeholder="https://example.com/"
        onChange={(event) => localValue.set(event.target.value)}
        onBlur={localValue.save}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            localValue.save();
          }
        }}
      />
    </Flex>
  );
};

const getPageId = (page: Page) => page.id;
const getPageName = (page: Page) => page.name;

const BasePage = ({ prop, onChange, id }: BaseControlProps) => {
  const pages = useStore(pagesStore);
  const options = pages === undefined ? [] : [pages.homePage, ...pages.pages];
  const value =
    prop?.type === "page"
      ? options.find((page) => page.id === prop.value)
      : undefined;

  return (
    <Flex css={{ py: theme.spacing[2] }}>
      <Select
        id={id}
        value={value}
        options={options}
        getLabel={getPageName}
        getValue={getPageId}
        onChange={(page) => onChange({ type: "page", value: page.id })}
        fullWidth
      />
    </Flex>
  );
};

// @todo: Section, Email, Phone, Attachment
const modes = ["url", "page"] as const;
type Mode = (typeof modes)[number];
const baseControls = {
  url: BaseUrl,
  page: BasePage,
} satisfies Record<Mode, unknown>;

export const UrlControl = ({
  meta,
  prop,
  propName,
  onChange,
  onDelete,
}: UrlControlProps) => {
  const initialMode = prop?.type === "page" ? "page" : "url";

  const [mode, setMode] = useState<Mode>(initialMode);

  const id = useId();

  const BaseControl = baseControls[mode];

  return (
    <VerticalLayout
      label={getLabel(meta, propName)}
      onDelete={onDelete}
      id={id}
    >
      <Flex
        css={{
          py: theme.spacing[2],

          // temporary fix for ToggleGroup
          // which borders protrude outside of the container
          px: theme.spacing[1],
        }}
      >
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(value) => {
            const asMode = modes.find((mode) => mode === value);
            if (asMode) {
              setMode(asMode);
            }
          }}
        >
          <ToggleGroupItem value={"url" satisfies Mode}>
            <Tooltip content="URL">
              <LinkIcon />
            </Tooltip>
          </ToggleGroupItem>
          <ToggleGroupItem value={"page" satisfies Mode}>
            <Tooltip content="Page">
              <PageIcon />
            </Tooltip>
          </ToggleGroupItem>
        </ToggleGroup>
      </Flex>

      <BaseControl id={id} prop={prop} onChange={onChange} />
    </VerticalLayout>
  );
};
