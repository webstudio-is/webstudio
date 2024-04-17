import {
  Button,
  Flex,
  Link,
  Separator,
  Text,
  Tooltip,
  buttonStyle,
  theme,
  truncate,
} from "@webstudio-is/design-system";
import type { MarketplaceOverviewItem } from "~/shared/marketplace/types";
import { Header } from "../../shared/panel";
import { ChevronDoubleLeftIcon, ExternalLinkIcon } from "@webstudio-is/icons";
import { builderUrl } from "~/shared/router-utils";

export const About = ({
  item,
  onClose,
}: {
  item?: MarketplaceOverviewItem;
  onClose: () => void;
}) => {
  if (item === undefined) {
    return;
  }
  return (
    <>
      <Header
        title={item.name}
        suffix={
          <Tooltip content="Close" side="bottom">
            <Button
              onClick={onClose}
              aria-label="Close"
              prefix={<ChevronDoubleLeftIcon />}
              color="ghost"
              // Tab should go:
              //   trought form fields -> create button -> cancel button
              tabIndex={3}
            />
          </Tooltip>
        }
      />
      <Flex
        direction="column"
        css={{ my: theme.spacing[5], mx: theme.spacing[8] }}
        gap="3"
      >
        <Text>{item.description}</Text>
        <Flex direction="column" gap="1">
          <Text truncate>Author: {item.author}</Text>
          {item.website && (
            <Flex gap="1">
              <Text css={{ flexShrink: 0 }}>Website:</Text>
              <Link href={item.website} target="_blank" css={truncate()}>
                {item.website}
              </Link>
            </Flex>
          )}
          <Flex gap="1">
            <Text css={{ flexShrink: 0 }}>Email:</Text>
            <Link href={`mailto:${item.email}`} css={truncate()}>
              {item.email}
            </Link>
          </Flex>
          {item.issues && (
            <Flex gap="1">
              <Text css={{ flexShrink: 0 }}>Issues Tracker:</Text>
              <Link href={item.issues} target="_blank" css={truncate()}>
                {item.issues}
              </Link>
            </Flex>
          )}
        </Flex>
      </Flex>
      <Separator />
      <Flex gap="1" css={{ my: theme.spacing[5], mx: theme.spacing[8] }}>
        <Link
          className={buttonStyle({
            color: "neutral",
            css: { gap: theme.spacing[3] },
          })}
          underline="none"
          href={builderUrl({
            projectId: item.projectId,
            origin: location.origin,
          })}
          target="_blank"
        >
          <ExternalLinkIcon aria-hidden /> Open project
        </Link>
      </Flex>
    </>
  );
};
