import { ChevronRightIcon } from "@webstudio-is/icons";
import { DeprecatedButton, Flex, Text } from "@webstudio-is/design-system";
import { useSelectedInstancePath } from "~/designer/shared/instance/use-selected-instance-path";
import { useSelectedInstanceData } from "~/designer/shared/nano-states";
import { theme } from "@webstudio-is/design-system";
import { selectedInstanceIdStore } from "~/shared/nano-states";

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
  const [selectedInstanceData] = useSelectedInstanceData();
  const selectedInstancePath = useSelectedInstancePath(
    selectedInstanceData?.id
  );
  return (
    <Flex align="center" css={{ height: "100%" }}>
      {selectedInstancePath.length === 0 ? (
        <Breadcrumb>
          <Text>No instance selected</Text>
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
