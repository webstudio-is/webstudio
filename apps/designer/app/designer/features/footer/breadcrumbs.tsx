import { ChevronRightIcon } from "@webstudio-is/icons";
import { Button, Flex, Text } from "@webstudio-is/design-system";
import { type Publish } from "~/shared/pubsub";
import { useSelectedInstancePath } from "~/designer/shared/instance/use-selected-instance-path";
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
          px: "$spacing$5",
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
          <Text>No instance selected</Text>
        </Breadcrumb>
      ) : (
        selectedInstancePath.map((instance) => (
          <Breadcrumb
            key={instance.id}
            onClick={() => {
              publish({
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
