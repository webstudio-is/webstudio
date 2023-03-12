import { useStore } from "@nanostores/react";
import { ChevronRightIcon } from "@webstudio-is/icons";
import {
  theme,
  DeprecatedButton,
  Flex,
  DeprecatedText2,
} from "@webstudio-is/design-system";
import {
  instancesStore,
  selectedInstanceAddressStore,
} from "~/shared/nano-states";
import { getAncestorInstanceAddress } from "~/shared/tree-utils";

type BreadcrumbProps = {
  children: JSX.Element | string;
  onClick?: () => void;
};

const Breadcrumb = ({ children, onClick }: BreadcrumbProps) => {
  return (
    <>
      <DeprecatedButton
        ghost
        onClick={onClick}
        css={{
          color: theme.colors.hiContrast,
          px: theme.spacing[5],
          borderRadius: "100vh",
          height: "100%",
        }}
      >
        {children}
      </DeprecatedButton>
      <ChevronRightIcon color="white" />
    </>
  );
};

export const Breadcrumbs = () => {
  const instances = useStore(instancesStore);
  const selectedInstanceAddress = useStore(selectedInstanceAddressStore);

  return (
    <Flex align="center" css={{ height: "100%" }}>
      {selectedInstanceAddress === undefined ? (
        <Breadcrumb>
          <DeprecatedText2>No instance selected</DeprecatedText2>
        </Breadcrumb>
      ) : (
        selectedInstanceAddress
          // start breadcrumbs from the root
          .slice()
          .reverse()
          .map((instanceId) => {
            const instance = instances.get(instanceId);
            if (instance === undefined) {
              return;
            }
            return (
              <Breadcrumb
                key={instance.id}
                onClick={() => {
                  selectedInstanceAddressStore.set(
                    getAncestorInstanceAddress(
                      selectedInstanceAddress,
                      instance.id
                    )
                  );
                }}
              >
                {instance.component}
              </Breadcrumb>
            );
          })
      )}
    </Flex>
  );
};
