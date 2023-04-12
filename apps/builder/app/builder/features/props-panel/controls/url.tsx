import { useStore } from "@nanostores/react";
import { pagesStore } from "~/shared/nano-states";
import {
  InputField,
  Flex,
  theme,
  useId,
  ToggleGroup,
  ToggleGroupItem,
  Select,
  Tooltip,
  Label,
} from "@webstudio-is/design-system";
import {
  AttachmentIcon,
  EmailIcon,
  LinkIcon,
  PageIcon,
  PhoneIcon,
} from "@webstudio-is/icons";
import { type ReactNode, useState } from "react";
import {
  type ControlProps,
  getLabel,
  useLocalValue,
  VerticalLayout,
} from "../shared";
import type { Page } from "@webstudio-is/project-build";
import { SelectAsset } from "./select-asset";

type UrlControlProps = ControlProps<"url", "string" | "page" | "asset">;

type BaseControlProps = {
  id: string;
  prop: UrlControlProps["prop"];
  onChange: UrlControlProps["onChange"];
  onSoftDelete: UrlControlProps["onSoftDelete"];
};

const Row = ({ children }: { children: ReactNode }) => (
  <Flex css={{ height: theme.spacing[13] }} align="center" justify="between">
    {children}
  </Flex>
);

const BaseUrl = ({ prop, onChange, id }: BaseControlProps) => {
  const localValue = useLocalValue(
    prop?.type === "string" ? prop.value : "",
    (value) => onChange({ type: "string", value })
  );

  return (
    <Row>
      <InputField
        id={id}
        value={localValue.value}
        placeholder="http://www.url.com"
        onChange={(event) => localValue.set(event.target.value)}
        onBlur={localValue.save}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            localValue.save();
          }
        }}
        css={{ width: "100%" }}
      />
    </Row>
  );
};

const BasePhone = ({ prop, onChange, id }: BaseControlProps) => {
  const localValue = useLocalValue(
    prop?.type === "string" && prop.value.startsWith("tel:")
      ? prop.value.slice(4)
      : "",
    (value) => onChange({ type: "string", value: `tel:${value}` })
  );

  return (
    <Row>
      <InputField
        id={id}
        value={localValue.value}
        type="tel"
        placeholder="+15555555555"
        onChange={(event) => localValue.set(event.target.value)}
        onBlur={localValue.save}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            localValue.save();
          }
        }}
        css={{ width: "100%" }}
      />
    </Row>
  );
};

const propToEmail = (prop?: UrlControlProps["prop"]) => {
  if (prop?.type !== "string") {
    return { email: "", subject: "" };
  }

  let url;
  try {
    url = new URL(prop.value);
    // eslint-disable-next-line no-empty
  } catch {}

  if (url === undefined || url.protocol !== "mailto:") {
    return { email: "", subject: "" };
  }

  return {
    email: url.pathname,
    subject: url.searchParams.get("subject") ?? "",
  };
};

const BaseEmail = ({ prop, onChange, id }: BaseControlProps) => {
  const localValue = useLocalValue(propToEmail(prop), ({ email, subject }) => {
    if (email === "") {
      onChange({ type: "string", value: "" });
      return;
    }
    const url = new URL(`mailto:${email}`);
    if (subject !== "") {
      url.searchParams.set("subject", subject);
    }
    onChange({ type: "string", value: url.toString() });
  });

  return (
    <>
      <Row>
        <InputField
          id={id}
          value={localValue.value.email}
          type="email"
          placeholder="email@address.com"
          onChange={(event) =>
            localValue.set((value) => ({ ...value, email: event.target.value }))
          }
          onBlur={localValue.save}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              localValue.save();
            }
          }}
          css={{ width: "100%" }}
        />
      </Row>
      <Row>
        <Label htmlFor={`${id}-subject`}>Subject</Label>
        <InputField
          id={`${id}-subject`}
          value={localValue.value.subject}
          placeholder="You've got mail!"
          onChange={(event) =>
            localValue.set((value) => ({
              ...value,
              subject: event.target.value,
            }))
          }
          onBlur={localValue.save}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              localValue.save();
            }
          }}
          css={{ width: theme.spacing[24] }}
        />
      </Row>
    </>
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
    <Row>
      <Select
        id={id}
        value={value}
        options={options}
        getLabel={getPageName}
        getValue={getPageId}
        onChange={(page) => onChange({ type: "page", value: page.id })}
        fullWidth
      />
    </Row>
  );
};

const BaseAttachment = ({ prop, onChange, onSoftDelete }: BaseControlProps) => (
  <Row>
    <SelectAsset
      prop={prop?.type === "asset" ? prop : undefined}
      onChange={onChange}
      onSoftDelete={onSoftDelete}
    />
  </Row>
);

const modes = {
  url: { icon: <LinkIcon />, control: BaseUrl, label: "URL" },
  page: { icon: <PageIcon />, control: BasePage, label: "Page" },
  email: { icon: <EmailIcon />, control: BaseEmail, label: "Email" },
  phone: { icon: <PhoneIcon />, control: BasePhone, label: "Phone" },
  attachment: {
    icon: <AttachmentIcon />,
    control: BaseAttachment,
    label: "Attachment",
  },
} as const;

type Mode = keyof typeof modes;

const propToMode = (prop?: UrlControlProps["prop"]): Mode => {
  if (prop === undefined) {
    return "url";
  }

  if (prop.type === "page") {
    return "page";
  }

  if (prop.type === "asset") {
    return "attachment";
  }

  if (prop.value.startsWith("tel:")) {
    return "phone";
  }

  if (prop.value.startsWith("mailto:")) {
    return "email";
  }

  return "url";
};

export const UrlControl = ({
  meta,
  prop,
  propName,
  onChange,
  onDelete,
  onSoftDelete,
}: UrlControlProps) => {
  const [mode, setMode] = useState<Mode>(propToMode(prop));

  const id = useId();

  const BaseControl = modes[mode].control;

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
            // too tricky to prove to TS that value is a Mode
            // doesn't worth it given we map over modes below
            setMode(value as Mode);
          }}
        >
          {Object.entries(modes).map(([key, { icon, label }]) => (
            <ToggleGroupItem value={key} key={key}>
              <Tooltip content={label}>{icon}</Tooltip>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Flex>

      <BaseControl
        id={id}
        prop={prop}
        onChange={onChange}
        onSoftDelete={onSoftDelete}
      />
    </VerticalLayout>
  );
};
