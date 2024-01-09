import { type ReactNode, useEffect } from "react";
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
import { $instances, $pages, $props } from "~/shared/nano-states";
import {
  BindingControl,
  BindingPopover,
} from "~/builder/shared/binding-popover";
import {
  type ControlProps,
  getLabel,
  useLocalValue,
  VerticalLayout,
  Label,
  updateExpressionValue,
  $selectedInstanceScope,
} from "../shared";
import { SelectAsset } from "./select-asset";

type UrlControlProps = ControlProps<"url">;

type BaseControlProps = {
  id: string;
  instanceId: string;
  readOnly: boolean;
  prop: UrlControlProps["prop"];
  value: string;
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

const BaseUrl = ({ readOnly, prop, value, onChange, id }: BaseControlProps) => {
  const localValue = useLocalValue(value, (value) => {
    if (prop?.type === "expression") {
      updateExpressionValue(prop.value, value);
    } else {
      onChange({ type: "string", value });
    }
  });

  useEffect(() => {
    return () => localValue.set(addHttpsIfMissing(localValue.value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Row>
      <InputField
        disabled={readOnly}
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

const BasePhone = ({
  readOnly,
  prop,
  value,
  onChange,
  id,
}: BaseControlProps) => {
  const localValue = useLocalValue(
    value.startsWith("tel:") ? value.slice(4) : "",
    (value) => {
      if (prop?.type === "expression") {
        updateExpressionValue(prop.value, `tel:${value}`);
      } else {
        onChange({ type: "string", value: `tel:${value}` });
      }
    }
  );

  return (
    <Row>
      <InputField
        id={id}
        disabled={readOnly}
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

const propToEmail = (value: string) => {
  let url;
  try {
    url = new URL(value);
  } catch {
    // empty block
  }

  if (url === undefined || url.protocol !== "mailto:") {
    return { email: "", subject: "" };
  }

  return {
    email: url.pathname,
    subject: url.searchParams.get("subject") ?? "",
  };
};

const BaseEmail = ({
  readOnly,
  prop,
  value,
  onChange,
  id,
}: BaseControlProps) => {
  const localValue = useLocalValue(propToEmail(value), ({ email, subject }) => {
    if (email === "") {
      if (prop?.type === "expression") {
        updateExpressionValue(prop.value, "");
      } else {
        onChange({ type: "string", value: "" });
      }
      return;
    }
    const url = new URL(`mailto:${email}`);
    if (subject !== "") {
      url.searchParams.set("subject", subject);
    }
    const value = url.toString();
    if (prop?.type === "expression") {
      updateExpressionValue(prop.value, value);
    } else {
      onChange({ type: "string", value });
    }
  });

  return (
    <>
      <Row>
        <InputField
          disabled={readOnly}
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
          disabled={readOnly}
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
  [$instances, $pages],
  (instances, pages) =>
    (pages ? [pages.homePage, ...pages.pages] : []).map((page) => ({
      pageId: page.id,
      instancesIds: findTreeInstanceIds(instances, page.rootInstanceId),
    }))
);

const $sections = computed(
  [instancesPerPageStore, $props],
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
  const pages = useStore($pages);

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

  const sections = useStore($sections);

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

const propToMode = (
  prop: undefined | UrlControlProps["prop"],
  value: string
): Mode => {
  if (prop === undefined) {
    return "url";
  }

  if (prop.type === "page") {
    return "page";
  }

  if (prop.type === "asset") {
    return "attachment";
  }

  if (value.startsWith("tel:")) {
    return "phone";
  }

  if (value.startsWith("mailto:")) {
    return "email";
  }

  return "url";
};

export const UrlControl = ({
  instanceId,
  meta,
  prop,
  propName,
  computedValue,
  readOnly,
  deletable,
  onChange,
  onDelete,
}: UrlControlProps) => {
  const value = String(computedValue ?? "");
  const { value: mode, set: setMode } = useLocalValue<Mode>(
    propToMode(prop, value),
    () => {}
  );

  const id = useId();

  const BaseControl = modes[mode].control;

  const label = getLabel(meta, propName);
  const { scope, aliases } = useStore($selectedInstanceScope);
  const expression =
    prop?.type === "expression" ? prop.value : JSON.stringify(computedValue);

  return (
    <VerticalLayout
      label={
        <Label htmlFor={id} description={meta.description}>
          {label}
        </Label>
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
          disabled={readOnly}
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

      <BindingControl>
        <BaseControl
          id={id}
          instanceId={instanceId}
          readOnly={readOnly}
          prop={prop}
          value={value}
          onChange={onChange}
          onDelete={onDelete}
        />
        <BindingPopover
          scope={scope}
          aliases={aliases}
          validate={(value) => {
            if (value !== undefined && typeof value !== "string") {
              return `${label} expects a string value, page or file`;
            }
          }}
          value={expression}
          onChange={(newExpression) =>
            onChange({ type: "expression", value: newExpression })
          }
          onRemove={(evaluatedValue) =>
            onChange({ type: "string", value: String(evaluatedValue) })
          }
        />
      </BindingControl>
    </VerticalLayout>
  );
};
