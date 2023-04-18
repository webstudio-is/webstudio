import { useStore } from "@nanostores/react";
import { computed } from "nanostores";
import {
  instancesStore,
  pagesStore,
  propsStore,
  selectedPageStore,
} from "~/shared/nano-states";
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
import { type ReactNode, useState, useMemo } from "react";
import {
  type ControlProps,
  getLabel,
  useLocalValue,
  VerticalLayout,
} from "../shared";
import {
  findTreeInstanceIds,
  type Instance,
  type Page,
} from "@webstudio-is/project-build";
import { SelectAsset } from "./select-asset";

type UrlControlProps = ControlProps<"url", "string" | "page" | "asset">;

type BaseControlProps = {
  id: string;
  instanceId: string;
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

const useSections = (page: { rootInstanceId: string }) => {
  const store = useMemo(
    () =>
      computed([instancesStore, propsStore], (instances, props) => {
        const pageInstances = findTreeInstanceIds(
          instances,
          page.rootInstanceId
        );

        const sections = new Map<Instance["id"], string>();

        for (const prop of props.values()) {
          if (
            prop.type === "string" &&
            prop.name === "id" &&
            prop.value.trim() !== "" &&
            pageInstances.has(prop.instanceId)
          ) {
            sections.set(prop.instanceId, prop.value);
          }
        }

        return sections;
      }),
    [page.rootInstanceId]
  );

  return useStore(store);
};

const getPageId = (page: Page) => page.id;
const getPageName = (page: Page) => page.name;

const BasePage = ({ prop, onChange }: BaseControlProps) => {
  const pages = useStore(pagesStore);

  const pageSelectOptions =
    pages === undefined ? [] : [pages.homePage, ...pages.pages];

  const pageSelectValue =
    prop?.type === "page"
      ? pageSelectOptions.find(
          (page) =>
            page.id ===
            (typeof prop.value === "string" ? prop.value : prop.value.pageId)
        )
      : undefined;

  const currentPage = useStore(selectedPageStore);
  const sectionsPage = pageSelectValue ?? currentPage;
  const sections = useSections(sectionsPage ?? { rootInstanceId: "" });

  const sectionSelectOptions = Array.from(sections.keys());

  const sectionSelectValue =
    prop?.type === "page" && typeof prop.value !== "string"
      ? prop.value.instanceId
      : undefined;

  return (
    <>
      <Row>
        <Select
          value={pageSelectValue}
          options={pageSelectOptions}
          getLabel={getPageName}
          getValue={getPageId}
          onChange={(page) => onChange({ type: "page", value: page.id })}
          placeholder="Current page"
          fullWidth
        />
      </Row>
      <Row>
        <Select
          key={sectionsPage?.id}
          disabled={sectionSelectOptions.length === 0}
          placeholder={
            sectionSelectOptions.length === 0
              ? "Selected page has no sections"
              : "Choose section"
          }
          value={sectionSelectValue}
          options={sectionSelectOptions}
          getLabel={(instanceId) => sections.get(instanceId) ?? ""}
          onChange={(instanceId) => {
            // for TypeScript
            if (sectionsPage === undefined) {
              return;
            }
            onChange({
              type: "page",
              value: { pageId: sectionsPage.id, instanceId },
            });
          }}
          fullWidth
        />
      </Row>
    </>
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
  instanceId,
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
        instanceId={instanceId}
        prop={prop}
        onChange={onChange}
        onSoftDelete={onSoftDelete}
      />
    </VerticalLayout>
  );
};
