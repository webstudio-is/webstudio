import { useStore } from "@nanostores/react";
import { ChevronRightIcon } from "@webstudio-is/icons";
import {
  DeprecatedButton,
  Flex,
  DeprecatedText2,
} from "@webstudio-is/design-system";
import { theme } from "@webstudio-is/design-system";
import { selectedInstanceIdStore } from "~/shared/nano-states";
import { useSelectedInstancePath } from "~/builder/shared/instance/use-selected-instance-path";

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
  const selectedInstanceId = useStore(selectedInstanceIdStore);
  const selectedInstancePath = useSelectedInstancePath(selectedInstanceId);
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
