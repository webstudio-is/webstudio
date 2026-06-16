import { useId } from "react";
import { useStore } from "@nanostores/react";
import { matchSorter } from "match-sorter";
import { Box, Combobox, Text, theme } from "@webstudio-is/design-system";
import {
  BindingControl,
  BindingPopover,
  validatePrimitiveValue,
} from "~/builder/shared/binding-popover";
import { useDraftValue } from "~/builder/shared/use-draft-value";
import { $props } from "~/shared/sync/data-stores";
import {
  type ControlProps,
  ResponsiveLayout,
  updateExpressionValue,
  $selectedInstanceScope,
  useBindingState,
  humanizeAttribute,
} from "../shared";
import { PropertyLabel } from "../property-label";

type TimeZoneItem = {
  value: string;
  label?: string;
};

const visitorTimeZone = "visitor";
const defaultTimeZone = "UTC";
const defaultDatetime = "dateTime attribute is not set";
const defaultLanguage = "en";
const defaultCountry = "GB";
const defaultDateStyle = "medium";
const defaultTimeStyle = "none";

const commonTimeZones = [
  "Europe/Berlin",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Dubai",
  "Australia/Sydney",
];

const getSupportedTimeZones = () => {
  const supportedValuesOf = (
    Intl as typeof Intl & {
      supportedValuesOf?: (key: "timeZone") => string[];
    }
  ).supportedValuesOf;
  return supportedValuesOf?.("timeZone") ?? [];
};

const getTimeZoneItem = (value: string): TimeZoneItem => ({
  value,
  label: value === visitorTimeZone ? "Visitor's timezone" : value,
});

const getTimeZoneItems = (options: string[]) => {
  return Array.from(
    new Set([...options, ...commonTimeZones, ...getSupportedTimeZones()])
  ).map(getTimeZoneItem);
};

const itemToString = (item: TimeZoneItem | null) => {
  return item?.label ?? item?.value ?? "";
};

const matchOrSuggestTimeZone = (
  search: string,
  items: TimeZoneItem[],
  itemToString: (item: TimeZoneItem) => string
) => {
  if (search.trim() === "") {
    return items;
  }
  const matched = matchSorter(items, search, {
    keys: [itemToString, "value"],
  });
  const trimmed = search.trim();
  if (
    matched.some(
      (item) => item.value.toLocaleLowerCase() === trimmed.toLocaleLowerCase()
    ) === false
  ) {
    matched.unshift({ value: trimmed });
  }
  return matched;
};

const getStringProp = (
  props: ReturnType<typeof $props.get>,
  instanceId: string,
  name: string,
  defaultValue: string
) => {
  for (const prop of props.values()) {
    if (prop.instanceId === instanceId && prop.name === name) {
      return prop.type === "string" ? prop.value : defaultValue;
    }
  }
  return defaultValue;
};

const getDate = (datetime: string) => {
  const date = new Date(datetime);
  if (Number.isNaN(date.getTime())) {
    return;
  }
  return date;
};

const isValidTimeZone = (timeZone: string) => {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
};

const styleOrUndefined = (
  value: string
): Intl.DateTimeFormatOptions["dateStyle"] => {
  return value === "full" ||
    value === "long" ||
    value === "medium" ||
    value === "short"
    ? value
    : undefined;
};

const getTimeZonePreview = ({
  item,
  date,
  locale,
  dateStyle,
  timeStyle,
  format,
}: {
  item: TimeZoneItem | null | undefined;
  date: Date | undefined;
  locale: string;
  dateStyle: string;
  timeStyle: string;
  format: string;
}) => {
  if (item === undefined || item === null) {
    return;
  }
  if (item.value === visitorTimeZone) {
    return "Uses each visitor's browser timezone after the page loads.";
  }
  if (isValidTimeZone(item.value) === false) {
    return "Unknown timezone. Use an IANA timezone like Europe/Berlin.";
  }
  if (date === undefined) {
    return "Select or type an IANA timezone.";
  }
  if (format.trim() !== "") {
    return "Preview uses the custom format on canvas.";
  }
  try {
    const formatted = new Intl.DateTimeFormat(locale, {
      dateStyle: styleOrUndefined(dateStyle),
      timeStyle: styleOrUndefined(timeStyle),
      timeZone: item.value,
    }).format(date);
    const offset = new Intl.DateTimeFormat(locale, {
      timeZone: item.value,
      timeZoneName: "shortOffset",
    })
      .formatToParts(date)
      .find((part) => part.type === "timeZoneName")?.value;
    return [offset, formatted].filter(Boolean).join(" · ");
  } catch {
    return "Unable to preview this timezone.";
  }
};

export const TimeZoneControl = ({
  meta,
  prop,
  propName,
  computedValue,
  instanceId,
  onChange,
}: ControlProps<"timeZone">) => {
  const id = useId();
  const props = useStore($props);
  const savedValue = String(
    computedValue ?? meta.defaultValue ?? defaultTimeZone
  );
  const localValue = useDraftValue(savedValue, (value) => {
    if (prop?.type === "expression") {
      updateExpressionValue(prop.value, value);
    } else {
      onChange({ type: "string", value });
    }
  });
  const timeZoneItems = getTimeZoneItems(meta.options);
  const selectedItem = getTimeZoneItem(savedValue);
  const currentItem = getTimeZoneItem(localValue.value);
  const label = humanizeAttribute(meta.label || propName);
  const { scope, aliases } = useStore($selectedInstanceScope);
  const expression =
    prop?.type === "expression" ? prop.value : JSON.stringify(computedValue);
  const { overwritable, variant } = useBindingState(
    prop?.type === "expression" ? prop.value : undefined
  );

  const datetime = getStringProp(
    props,
    instanceId,
    "datetime",
    defaultDatetime
  );
  const language = getStringProp(
    props,
    instanceId,
    "language",
    defaultLanguage
  );
  const country = getStringProp(props, instanceId, "country", defaultCountry);
  const dateStyle = getStringProp(
    props,
    instanceId,
    "dateStyle",
    defaultDateStyle
  );
  const timeStyle = getStringProp(
    props,
    instanceId,
    "timeStyle",
    defaultTimeStyle
  );
  const format = getStringProp(props, instanceId, "format", "");
  const date = getDate(datetime);
  const locale = `${language}-${country}`;

  return (
    <ResponsiveLayout
      label={
        <PropertyLabel name={propName} readOnly={overwritable === false} />
      }
    >
      <BindingControl>
        <Combobox<TimeZoneItem>
          name={id}
          disabled={overwritable === false}
          getItems={() => timeZoneItems}
          itemToString={itemToString}
          value={currentItem}
          selectedItem={selectedItem}
          match={matchOrSuggestTimeZone}
          onChange={(value) => {
            if (value !== undefined) {
              localValue.set(value.trim());
            }
          }}
          onItemSelect={(item) => {
            localValue.set(item.value.trim());
            localValue.flush();
          }}
          getDescription={(item) => {
            const preview = getTimeZonePreview({
              item,
              date,
              locale,
              dateStyle,
              timeStyle,
              format,
            });
            return (
              <Box css={{ width: theme.spacing[28] }}>
                <Text>{preview ?? "Select or type an IANA timezone."}</Text>
              </Box>
            );
          }}
        />
        <BindingPopover
          scope={scope}
          aliases={aliases}
          validate={(value) => validatePrimitiveValue(value, label)}
          variant={variant}
          value={expression}
          onChange={(newExpression) =>
            onChange({ type: "expression", value: newExpression })
          }
          onRemove={(evaluatedValue) =>
            onChange({ type: "string", value: String(evaluatedValue) })
          }
        />
      </BindingControl>
    </ResponsiveLayout>
  );
};
