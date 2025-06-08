import { Fragment } from "react";
import { useStore } from "@nanostores/react";
import { ChevronRightIcon } from "@webstudio-is/icons";
import { theme, Button, Flex, Text } from "@webstudio-is/design-system";
import { $textEditingInstanceSelector } from "~/shared/nano-states";
import { $selectedInstancePath, selectInstance } from "~/shared/awareness";
import { InstanceLabel } from "~/builder/shared/instance-label";

export const Breadcrumbs = () => {
  const instancePath = useStore($selectedInstancePath);
  return (
    <Flex align="center" css={{ height: "100%", px: theme.spacing[3] }}>
      {instancePath === undefined ? (
        <Text>No instance selected</Text>
      ) : (
        instancePath
          // start breadcrumbs from the root
          .slice()
          .reverse()
          .map(({ instance, instanceSelector }, index) => {
            return (
              <Fragment key={index}>
                <Button
                  color="dark-ghost"
                  css={{ color: "inherit" }}
                  key={instance.id}
                  onClick={() => {
                    selectInstance(instanceSelector);
                    $textEditingInstanceSelector.set(undefined);
                  }}
                >
                  <InstanceLabel instance={instance} />
                </Button>
                {/* hide the last one */}
                {index < instancePath.length - 1 && <ChevronRightIcon />}
              </Fragment>
            );
          })
      )}
    </Flex>
  );
};
