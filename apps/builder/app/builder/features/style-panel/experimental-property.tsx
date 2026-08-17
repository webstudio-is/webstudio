import { AlertIcon } from "@webstudio-is/icons";
import { experimentalProperties, propertiesData } from "@webstudio-is/css-data";
import {
  Flex,
  Link,
  rawTheme,
  Text,
  Tooltip,
} from "@webstudio-is/design-system";

const experimentalPropertySet = new Set<string>(experimentalProperties);

export const isExperimentalProperty = (property: string) =>
  experimentalPropertySet.has(property);

export const ExperimentalPropertyDescription = ({
  property,
}: {
  property: string;
}) => {
  if (isExperimentalProperty(property) === false) {
    return;
  }

  const mdnUrl =
    propertiesData[property as keyof typeof propertiesData]?.mdnUrl;

  return (
    <Flex direction="column" gap="1">
      <Text>This CSS property is experimental and may change.</Text>
      {mdnUrl && (
        <Link href={mdnUrl} target="_blank" rel="noreferrer" color="inherit">
          Learn more on MDN
        </Link>
      )}
    </Flex>
  );
};

export const ExperimentalPropertyIcon = ({
  property,
  withTooltip = false,
}: {
  property: string;
  withTooltip?: boolean;
}) => {
  if (isExperimentalProperty(property) === false) {
    return;
  }

  const icon = (
    <Flex
      as="span"
      align="center"
      aria-label={`${property} is experimental`}
      css={{ color: rawTheme.colors.backgroundAlertMain }}
    >
      <AlertIcon size={12} />
    </Flex>
  );

  if (withTooltip === false) {
    return icon;
  }

  return (
    <Tooltip
      variant="wrapped"
      content={<ExperimentalPropertyDescription property={property} />}
    >
      {icon}
    </Tooltip>
  );
};
