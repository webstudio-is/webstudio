import {
  Button,
  Flex,
  Link,
  Text,
  Tooltip,
  theme,
} from "@webstudio-is/design-system";
import type { MarketplaceOverviewItem } from "~/shared/marketplace/types";
import { Header } from "../../shared/panel";
import { ChevronDoubleLeftIcon } from "@webstudio-is/icons";

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
          <Text>Author: {item.author}</Text>
          {item.website && (
            <Flex gap="1">
              <Text>Website:</Text>
              <Link href={item.website} target="_blank">
                {item.website}
              </Link>
            </Flex>
          )}
          <Flex gap="1">
            <Text>Email:</Text>
            <Link href={`mailto:${item.email}`}>{item.email}</Link>
          </Flex>
          {item.issues && (
            <Flex gap="1">
              <Text>Issues Tracker:</Text>
              <Link href={item.issues} target="_blank">
                {item.issues}
              </Link>
            </Flex>
          )}
        </Flex>
      </Flex>
    </>
  );
};
