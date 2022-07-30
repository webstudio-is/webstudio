import { ChevronRightIcon } from "@webstudio-is/icons";
import { Button, Flex, Text } from "@webstudio-is/design-system";
import { useSelectedInstancePath } from "~/designer/shared/instance/use-selected-instance-path";
import { type Publish, type Instance } from "@webstudio-is/react-sdk";
import { useSelectedInstanceData } from "~/designer/shared/nano-states";

type BreadcrumbProps = {
  component: Instance["component"];
  onClick?: () => void;
};

const Breadcrumb = ({ component, onClick }: BreadcrumbProps) => {
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
          lineHeight: "100%",
        }}
      >
        {component}
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
        <Breadcrumb component={<Text size="1">No instance selected</Text>} />
      ) : (
        selectedInstancePath.map((instance) => (
          <Breadcrumb
            key={instance.id}
            component={instance.component}
            onClick={() => {
              publish<"selectInstanceById", Instance["id"]>({
                type: "selectInstanceById",
                payload: instance.id,
              });
            }}
          />
        ))
      )}
    </Flex>
  );
};
