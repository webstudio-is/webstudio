import { useMemo } from "react";
import { useStore } from "@nanostores/react";
import { Flex, Text } from "@webstudio-is/design-system";
import type { Instance } from "@webstudio-is/sdk";
import { $instances, $pages } from "~/shared/sync/data-stores";
import { buildInstancePath } from "~/shared/instance-utils";

type InstancePathFooterProps = {
  instanceId: Instance["id"];
};

export const InstancePathFooter = ({ instanceId }: InstancePathFooterProps) => {
  const instances = useStore($instances);
  const pages = useStore($pages);

  const path = useMemo(() => {
    if (!pages || !instances || !instances.has(instanceId)) {
      return;
    }
    return buildInstancePath(instanceId, pages, instances);
  }, [instanceId, pages, instances]);

  if (!path) {
    return;
  }

  return (
    <Flex grow>
      <Text color="moreSubtle" truncate>
        /{path.join("/")}
      </Text>
    </Flex>
  );
};
