import { useStore } from "@nanostores/react";
import { ChevronRightIcon } from "@webstudio-is/icons";
import {
  theme,
  DeprecatedButton,
  Flex,
  Text,
} from "@webstudio-is/design-system";
import {
  $instances,
  $registeredComponentMetas,
  $selectedInstanceSelector,
  $selectedStyleSourceSelector,
} from "~/shared/nano-states";
import { getAncestorInstanceSelector } from "~/shared/tree-utils";
import { $textEditingInstanceSelector } from "~/shared/nano-states";
import { getInstanceLabel } from "~/shared/instance-utils";
import { Fragment } from "react";

export const Breadcrumbs = () => {
  const instances = useStore($instances);
  const selectedInstanceSelector = useStore($selectedInstanceSelector);
  const metas = useStore($registeredComponentMetas);

  return (
    <Flex
      align="center"
      css={{
        height: "100%",
        color: theme.colors.hiContrast,
        px: theme.spacing[3],
      }}
    >
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
                <DeprecatedButton
                  ghost
                  css={{
                    px: theme.spacing[5],
                    borderRadius: "100vh",
                    height: "100%",
                  }}
                  key={instance.id}
                  onClick={() => {
                    $selectedInstanceSelector.set(
                      getAncestorInstanceSelector(
                        selectedInstanceSelector,
                        instance.id
                      )
                    );
                    $textEditingInstanceSelector.set(undefined);
                    $selectedStyleSourceSelector.set(undefined);
                  }}
                >
                  {getInstanceLabel(instance, meta)}
                </DeprecatedButton>
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
