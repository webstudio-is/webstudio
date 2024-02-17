import { useLoaderData } from "@remix-run/react";
import {
  type BuilderProps,
  Builder,
  links,
} from "~/builder/builder-marketplace";

export * from "./_builder-shared";
export { links };

const BuilderMarketplaceRoute = () => {
  const data = useLoaderData<BuilderProps>();
  return <Builder {...data} />;
};

export default BuilderMarketplaceRoute;
