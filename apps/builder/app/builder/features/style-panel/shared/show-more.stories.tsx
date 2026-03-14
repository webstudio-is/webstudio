import { Text } from "@webstudio-is/design-system";
import { ShowMore } from "./show-more";

export default {
  title: "Builder/Style Panel/Show More",
  component: ShowMore,
};

export const WithItems = () => (
  <ShowMore
    styleConfigs={[
      <Text key="1">First config item</Text>,
      <Text key="2">Second config item</Text>,
      <Text key="3">Third config item</Text>,
    ]}
  />
);

export const Empty = () => <ShowMore styleConfigs={[]} />;
