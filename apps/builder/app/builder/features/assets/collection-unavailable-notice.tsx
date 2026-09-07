import { useState } from "react";
import { PanelBanner, Button, Flex, Text } from "@webstudio-is/design-system";
import type { ContentCollection } from "~/builder/shared/assets";

type UnavailableCollection = Extract<
  ContentCollection,
  { status: "unavailable" }
>;
type RetryableCollection = Extract<
  ContentCollection,
  { status: "invalid" | "unavailable" }
>;

export const CollectionRetryButton = ({
  collection,
  onCheckAgain,
}: {
  collection: RetryableCollection;
  onCheckAgain: () => void;
}) => {
  const [checkingCollection, setCheckingCollection] = useState<
    RetryableCollection | undefined
  >();
  const checking = checkingCollection === collection;

  return (
    <Button
      disabled={checking}
      onClick={() => {
        setCheckingCollection(collection);
        onCheckAgain();
      }}
    >
      {checking ? "Retrying…" : "Retry"}
    </Button>
  );
};

export const CollectionUnavailableNotice = ({
  collection,
  onCheckAgain,
}: {
  collection: UnavailableCollection;
  onCheckAgain: () => void;
}) => {
  return (
    <PanelBanner role="alert" variant="error" css={{ flexShrink: 0 }}>
      <Flex align="center" justify="between" gap={2}>
        <Text>
          Couldn’t load collection settings. Retry to use collection actions.
        </Text>
        <Flex>
          <CollectionRetryButton
            collection={collection}
            onCheckAgain={onCheckAgain}
          />
        </Flex>
      </Flex>
    </PanelBanner>
  );
};
