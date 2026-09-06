import { useState } from "react";
import { Button, Flex, Text, theme } from "@webstudio-is/design-system";
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
      {checking ? "Checking…" : "Check again"}
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
    <Flex
      role="alert"
      direction="column"
      gap={2}
      css={{ padding: theme.panel.padding }}
    >
      <Text color="destructive" variant="tiny">
        {collection.message}
      </Text>
      <Flex>
        <CollectionRetryButton
          collection={collection}
          onCheckAgain={onCheckAgain}
        />
      </Flex>
    </Flex>
  );
};
