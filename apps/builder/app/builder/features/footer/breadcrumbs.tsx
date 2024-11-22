import { Fragment } from "react";
import { useStore } from "@nanostores/react";
import { ChevronRightIcon } from "@webstudio-is/icons";
import { theme, Button, Flex, Text } from "@webstudio-is/design-system";
import {
  $instances,
  $registeredComponentMetas,
  $selectedInstanceSelector,
} from "~/shared/nano-states";
import { getAncestorInstanceSelector } from "~/shared/tree-utils";
import { $textEditingInstanceSelector } from "~/shared/nano-states";
import { getInstanceLabel } from "~/shared/instance-utils";
import { selectInstance } from "~/shared/awareness";

export const Breadcrumbs = () => {
  const instances = useStore($instances);
  const selectedInstanceSelector = useStore($selectedInstanceSelector);
  const metas = useStore($registeredComponentMetas);

  return (
    <Flex align="center" css={{ height: "100%", px: theme.spacing[3] }}>
      {selectedInstanceSelector === undefined ? (
        <Text>No instance selected</Text>
      ) : (
        selectedInstanceSelector
          // start breadcrumbs from the root
          .slice()
          .reverse()
          .map((instanceId, index) => {
            const instance = instances.get(instanceId);
            if (instance === undefined) {
              return;
            }
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
                    selectInstance(
                      getAncestorInstanceSelector(
                        selectedInstanceSelector,
                        instance.id
                      )
                    );
                    $textEditingInstanceSelector.set(undefined);
                  }}
                >
                  {getInstanceLabel(instance, meta)}
                </Button>
                {index < selectedInstanceSelector.length - 1 ? (
                  <ChevronRightIcon />
                ) : null}
              </Fragment>
            );
          })
      )}
    </Flex>
  );
};
