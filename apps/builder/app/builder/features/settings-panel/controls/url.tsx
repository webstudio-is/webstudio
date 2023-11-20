import { type ReactNode, useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { computed } from "nanostores";
import {
  theme,
  useId,
  InputField,
  Flex,
  ToggleGroup,
  ToggleGroupButton,
  Select,
  Tooltip,
  Box,
} from "@webstudio-is/design-system";
import {
  AttachmentIcon,
  EmailIcon,
  LinkIcon,
  PageIcon,
  PhoneIcon,
} from "@webstudio-is/icons";
import type { Instance, Page } from "@webstudio-is/sdk";
import { findTreeInstanceIds } from "@webstudio-is/sdk";
import { instancesStore, pagesStore, propsStore } from "~/shared/nano-states";
import {
  type ControlProps,
  getLabel,
  useLocalValue,
  VerticalLayout,
  Label,
} from "../shared";
import { SelectAsset } from "./select-asset";
import { VariablesButton } from "../variables";

type UrlControlProps = ControlProps<"url", "string" | "page" | "asset">;

type BaseControlProps = {
  id: string;
  instanceId: string;
  prop: UrlControlProps["prop"];
  onChange: UrlControlProps["onChange"];
  onDelete: UrlControlProps["onDelete"];
};

const Row = ({ children }: { children: ReactNode }) => (
  <Flex css={{ height: theme.spacing[13] }} align="center" justify="between">
    {children}
  </Flex>
);

const canParse = (value: string) => {
  try {
    return Boolean(new URL(value));
  } catch {
    return false;
  }
};

/**
 * Add protocol to URL if it appears absolute and valid. Leave it unchanged otherwise.
 **/
const addHttpsIfMissing = (url: string) => {
  if (url.startsWith("//") && canParse(`https:${url}`)) {
    return new URL(`https:${url}`).href;
  }

  if (url.startsWith("/")) {
    return url;
  }

  if (canParse(url)) {
    return new URL(url).href;
  }

  if (canParse(`https://${url}`)) {
    return new URL(`https://${url}`).href;
  }

  return url;
};

const BaseUrl = ({ prop, onChange, id }: BaseControlProps) => {
  const localValue = useLocalValue(
    prop?.type === "string" ? prop.value : "",
    (value) => onChange({ type: "string", value })
  );

  useEffect(() => {
    return () => localValue.set(addHttpsIfMissing(localValue.value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Row>
      <InputField
        id={id}
        value={localValue.value}
        placeholder="http://www.url.com"
        onChange={(event) => localValue.set(event.target.value)}
        onBlur={() => {
          localValue.set(addHttpsIfMissing(localValue.value));
          localValue.save();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            localValue.set(addHttpsIfMissing(localValue.value));
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
            localValue.set({ ...localValue.value, email: event.target.value })
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
            localValue.set({
              ...localValue.value,
              subject: event.target.value,
            })
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

const instancesPerPageStore = computed(
  [instancesStore, pagesStore],
  (instances, pages) =>
    (pages ? [pages.homePage, ...pages.pages] : []).map((page) => ({
      pageId: page.id,
      instancesIds: findTreeInstanceIds(instances, page.rootInstanceId),
    }))
);

const sectionsStore = computed(
  [instancesPerPageStore, propsStore],
  (instancesPerPage, props) => {
    const sections: Array<{
      pageId: Page["id"];
      instanceId: Instance["id"];
      hash: string;
    }> = [];

    for (const prop of props.values()) {
      if (
        prop.type === "string" &&
        prop.name === "id" &&
        prop.value.trim() !== ""
      ) {
        for (const { pageId, instancesIds } of instancesPerPage) {
          if (instancesIds.has(prop.instanceId)) {
            sections.push({
              pageId,
              instanceId: prop.instanceId,
              hash: prop.value,
            });
          }
        }
      }
    }

    return sections.sort((a, b) => a.hash.localeCompare(b.hash));
  }
);

const getId = (data: { id: string }) => data.id;
const getName = (data: { name: string }) => data.name;
const getHash = (data: { hash: string }) => data.hash;
const getInstanceId = (data: { instanceId: string }) => data.instanceId;

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

  const sections = useStore(sectionsStore);

  const sectionSelectOptions = pageSelectValue
    ? sections.filter(({ pageId }) => pageId === pageSelectValue.id)
    : sections;

  const sectionInstanceId =
    prop?.type === "page" && typeof prop.value !== "string"
      ? prop.value.instanceId
      : undefined;

  const sectionSelectValue =
    sectionInstanceId === undefined
      ? undefined
      : sectionSelectOptions.find(
          ({ instanceId }) => instanceId === sectionInstanceId
        );

  return (
    <>
      <Row>
        <Select
          value={pageSelectValue}
          options={pageSelectOptions}
          getLabel={getName}
          getValue={getId}
          onChange={({ id }) => onChange({ type: "page", value: id })}
          placeholder="Choose page"
          fullWidth
        />
      </Row>
      <Row>
        <Select
          key={pageSelectValue?.id}
          disabled={sectionSelectOptions.length === 0}
          placeholder={
            sectionSelectOptions.length === 0
              ? pageSelectValue
                ? "Selected page has no sections"
                : "No sections available"
              : "Choose section"
          }
          value={sectionSelectValue}
          options={sectionSelectOptions}
          getLabel={getHash}
          getValue={getInstanceId}
          onChange={({ pageId, instanceId }) =>
            onChange({ type: "page", value: { pageId, instanceId } })
          }
          fullWidth
        />
      </Row>
    </>
  );
};

const BaseAttachment = ({ prop, onChange, onDelete }: BaseControlProps) => (
  <Row>
    <SelectAsset
      prop={prop?.type === "asset" ? prop : undefined}
      onChange={onChange}
      onDelete={onDelete}
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
  deletable,
  onChange,
  onDelete,
}: UrlControlProps) => {
  const [mode, setMode] = useState<Mode>(propToMode(prop));

  const id = useId();

  const BaseControl = modes[mode].control;

  return (
    <VerticalLayout
      label={
        <Box css={{ position: "relative" }}>
          <Label htmlFor={id} description={meta.description}>
            {getLabel(meta, propName)}
          </Label>
          <VariablesButton
            propId={prop?.id}
            propName={propName}
            propMeta={meta}
          />
        </Box>
      }
      deletable={deletable}
      onDelete={onDelete}
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
            <Tooltip key={key} content={label}>
              <ToggleGroupButton value={key}>{icon}</ToggleGroupButton>
            </Tooltip>
          ))}
        </ToggleGroup>
      </Flex>

      <BaseControl
        id={id}
        instanceId={instanceId}
        prop={prop}
        onChange={onChange}
        onDelete={onDelete}
      />
    </VerticalLayout>
  );
};
