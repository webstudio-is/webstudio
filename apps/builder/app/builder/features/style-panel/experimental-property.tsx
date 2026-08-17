import { AlertIcon } from "@webstudio-is/icons";
import { experimentalProperties, propertiesData } from "@webstudio-is/css-data";
import { Flex, Link, rawTheme, Text } from "@webstudio-is/design-system";

const experimentalPropertySet = new Set<string>(experimentalProperties);

const getExperimentalPropertyMdnUrl = (property: string) => {
  if (experimentalPropertySet.has(property) === false) {
    return;
  }
  return (
    propertiesData[property as keyof typeof propertiesData]?.mdnUrl ??
    `https://developer.mozilla.org/docs/Web/CSS/${encodeURIComponent(property)}`
  );
};

export const ExperimentalPropertyDescription = ({
  property,
}: {
  property: string;
}) => {
  const mdnUrl = getExperimentalPropertyMdnUrl(property);
  if (mdnUrl === undefined) {
    return;
  }

  return (
    <Flex direction="column" gap="1">
      <Text>This CSS property is experimental and may change.</Text>
      <Link href={mdnUrl} target="_blank" rel="noreferrer" color="inherit">
        Learn more on MDN
      </Link>
    </Flex>
  );
};

export const ExperimentalPropertyIcon = ({
  property,
}: {
  property: string;
}) => {
  if (getExperimentalPropertyMdnUrl(property) === undefined) {
    return;
  }

  return (
    <Flex
      as="span"
      align="center"
      aria-label={`${property} is experimental`}
      css={{ color: rawTheme.colors.backgroundAlertMain }}
    >
      <AlertIcon size={12} />
    </Flex>
  );
};
