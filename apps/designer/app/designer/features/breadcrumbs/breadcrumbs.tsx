import { ChevronRightIcon } from "~/shared/icons";
import { Button, Flex, Text, darkTheme } from "~/shared/design-system";
import { useSelectedInstancePath } from "../../shared/instance/use-selected-instance-path";
import { type Publish, type Instance } from "@webstudio-is/sdk";
import { useSelectedInstanceData } from "~/designer/shared/nano-states";

type BreadcrumbProps = {
  component: Instance["component"];
  onClick: () => void;
};

const Breadcrumb = ({ component, onClick }: BreadcrumbProps) => {
  return (
    <Flex
      align="center"
      css={{
        "& button": {
          color: "$hiContrast",
          px: "0",
        },
        "& path": {
          fill: "$hiContrast",
        },
      }}
    >
      <Button ghost onClick={onClick}>
        {component}
      </Button>
      <ChevronRightIcon />
    </Flex>
  );
};

const EmptyState = () => <Text size="1">No instance selected</Text>;

type BreadcrumbsProps = {
  publish: Publish;
};
export const Breadcrumbs = ({ publish }: BreadcrumbsProps) => {
  const [selectedInstanceData] = useSelectedInstanceData();
  const selectedInstancePath = useSelectedInstancePath(
    selectedInstanceData?.id
  );
  return (
    <Flex
      className={darkTheme}
      as="footer"
      align="center"
      css={{
        height: "$5",
        background: "$loContrast",
        padding: "$2",
      }}
    >
      {selectedInstancePath.length === 0 ? (
        <EmptyState />
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
