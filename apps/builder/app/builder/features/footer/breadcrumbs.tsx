import { useMemo } from "react";
import { useStore } from "@nanostores/react";
import { ChevronRightIcon } from "@webstudio-is/icons";
import {
  theme,
  DeprecatedButton,
  Flex,
  DeprecatedText2,
} from "@webstudio-is/design-system";
import {
  instancesIndexStore,
  selectedInstanceIdStore,
} from "~/shared/nano-states";
import { getInstanceAncestorsAndSelf } from "~/shared/tree-utils";

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
  const instancesIndex = useStore(instancesIndexStore);
  const selectedInstanceId = useStore(selectedInstanceIdStore);

  const selectedInstancePath = useMemo(() => {
    if (selectedInstanceId === undefined) {
      return [];
    }
    return getInstanceAncestorsAndSelf(instancesIndex, selectedInstanceId);
  }, [selectedInstanceId, instancesIndex]);

  return (
    <Flex align="center" css={{ height: "100%" }}>
      {selectedInstancePath.length === 0 ? (
        <Breadcrumb>
          <DeprecatedText2>No instance selected</DeprecatedText2>
        </Breadcrumb>
      ) : (
        selectedInstancePath.map((instance) => (
          <Breadcrumb
            key={instance.id}
            onClick={() => {
              selectedInstanceIdStore.set(instance.id);
            }}
          >
            {instance.component}
          </Breadcrumb>
        ))
      )}
    </Flex>
  );
};
