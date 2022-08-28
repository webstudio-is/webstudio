import { ChevronRightIcon } from "@webstudio-is/icons";
import { Button, Flex, __DEPRECATED__Text } from "@webstudio-is/design-system";
import { useSelectedInstancePath } from "~/designer/shared/instance/use-selected-instance-path";
import { type Publish, type Instance } from "@webstudio-is/react-sdk";
import { useSelectedInstanceData } from "~/designer/shared/nano-states";

type BreadcrumbProps = {
  children: JSX.Element | string;
  onClick?: () => void;
};

const Breadcrumb = ({ children, onClick }: BreadcrumbProps) => {
  return (
    <>
      <Button
        ghost
        onClick={onClick}
        css={{
          color: "$hiContrast",
          px: "$2",
          borderRadius: "100vh",
          height: "100%",
        }}
      >
        {children}
      </Button>
      <ChevronRightIcon color="white" />
    </>
  );
};

type BreadcrumbsProps = {
  publish: Publish;
};
export const Breadcrumbs = ({ publish }: BreadcrumbsProps) => {
  const [selectedInstanceData] = useSelectedInstanceData();
  const selectedInstancePath = useSelectedInstancePath(
    selectedInstanceData?.id
  );
  return (
    <Flex align="center" css={{ height: "100%" }}>
      {selectedInstancePath.length === 0 ? (
        <Breadcrumb>
          <__DEPRECATED__Text size="1">No instance selected</__DEPRECATED__Text>
        </Breadcrumb>
      ) : (
        selectedInstancePath.map((instance) => (
          <Breadcrumb
            key={instance.id}
            onClick={() => {
              publish<"selectInstanceById", Instance["id"]>({
                type: "selectInstanceById",
                payload: instance.id,
              });
            }}
          >
            {instance.component}
          </Breadcrumb>
        ))
      )}
    </Flex>
  );
};
