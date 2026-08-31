import { AlertIcon } from "@webstudio-is/icons";
import { propertiesData, propertyStatuses } from "@webstudio-is/css-data";
import { cssVar, Flex, Link, Text, Tooltip } from "@webstudio-is/design-system";

type PropertyStatus = (typeof propertyStatuses)[keyof typeof propertyStatuses];

const statusDescriptions = {
  experimental:
    "This CSS property is experimental. Browser support may be limited, and its behavior may change.",
  nonstandard:
    "This CSS property is non-standard. It may work only in specific browsers and can change or be removed without notice.",
  obsolete:
    "This CSS property is obsolete. Browsers may no longer support it, and it should not be used in new projects.",
} satisfies Record<Exclude<PropertyStatus, "standard">, string>;

export const getPropertyStatusDetails = (property: string) => {
  const status = propertyStatuses[property as keyof typeof propertyStatuses];
  if (status === undefined || status === "standard") {
    return;
  }

  return {
    status,
    description: statusDescriptions[status],
    mdnUrl:
      propertiesData[property as keyof typeof propertiesData]?.mdnUrl ??
      `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(property)}`,
  };
};

export const PropertyStatusDescription = ({
  property,
}: {
  property: string;
}) => {
  const details = getPropertyStatusDetails(property);
  if (details === undefined) {
    return;
  }

  return (
    <Flex direction="column" gap="1">
      <Text>{details.description}</Text>
      <Link
        href={details.mdnUrl}
        target="_blank"
        rel="noreferrer"
        color="inherit"
      >
        Learn more on MDN
      </Link>
    </Flex>
  );
};

export const PropertyStatusIcon = ({ property }: { property: string }) => {
  const details = getPropertyStatusDetails(property);
  if (details === undefined) {
    return;
  }

  return (
    <Flex
      as="span"
      align="center"
      aria-label={`${property} is ${details.status}`}
      css={{ color: cssVar("--foreground-warning") }}
    >
      <AlertIcon size={12} />
    </Flex>
  );
};

export const PropertyStatusIndicator = ({ property }: { property: string }) => {
  if (getPropertyStatusDetails(property) === undefined) {
    return;
  }

  return (
    <Tooltip
      variant="wrapped"
      content={<PropertyStatusDescription property={property} />}
    >
      <Flex as="span" css={{ marginLeft: "3px" }}>
        <PropertyStatusIcon property={property} />
      </Flex>
    </Tooltip>
  );
};
