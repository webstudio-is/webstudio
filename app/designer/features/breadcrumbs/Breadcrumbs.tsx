import { ChevronRightIcon } from "~/shared/icons";
import { Button, Flex, Text } from "~/shared/design-system";
import { useSelectedInstancePath } from "../../shared/instance/use-selected-instance-path";
import { Instance } from "@webstudio-is/sdk";
import { Publish } from "../canvas-iframe";

type BreadcrumbProps = {
  component: Instance["component"];
  onClick: () => void;
};

const Breadcrumb = ({ component, onClick }: BreadcrumbProps) => {
  return (
    <Flex align="center">
      <Button ghost css={{ color: "$loContrast", px: 0 }} onClick={onClick}>
        {component}
      </Button>{" "}
      <ChevronRightIcon />
    </Flex>
  );
};

const EmptyState = () => (
  <Text variant="loContrast" size="1">
    No instance selected
  </Text>
);

type BreadcrumbsProps = {
  publish: Publish;
};
export const Breadcrumbs = ({ publish }: BreadcrumbsProps) => {
  const selectedInstancePath = useSelectedInstancePath();
  return (
    <Flex
      as="footer"
      align="center"
      css={{ height: "$5", background: "$hiContrast", padding: "$1" }}
    >
      {selectedInstancePath.length === 0 ? (
        <EmptyState />
      ) : (
        selectedInstancePath.map((instance) => (
          <Breadcrumb
            key={instance.id}
            component={instance.component}
            onClick={() => {
              publish<"focusElement", Instance["id"]>({
                type: "focusElement",
                payload: instance.id,
              });
            }}
          />
        ))
      )}
    </Flex>
  );
};
