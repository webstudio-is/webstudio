import { Fragment } from "react";
import { useStore } from "@nanostores/react";
import { ChevronRightIcon } from "@webstudio-is/icons";
import { theme, Button, Flex, Text } from "@webstudio-is/design-system";
import { $registeredComponentMetas } from "~/shared/nano-states";
import { $textEditingInstanceSelector } from "~/shared/nano-states";
import { getInstanceLabel } from "~/shared/instance-utils";
import { $selectedInstancePath, selectInstance } from "~/shared/awareness";

export const Breadcrumbs = () => {
  const instancePath = useStore($selectedInstancePath);
  const metas = useStore($registeredComponentMetas);
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
            const meta = metas.get(instance.component);
            if (meta === undefined) {
              return;
            }
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
                  {getInstanceLabel(instance, meta)}
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
