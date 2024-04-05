// Our root outlet doesn't contain a layout because we have 2 types of documents: canvas and builder and we need to decide down the line which one to render, thre is no single root document.
import { Outlet } from "@remix-run/react";
import { setEnv } from "@webstudio-is/feature-flags";
import env from "./shared/env";
import type { ComponentProps } from "react";
import { useSetFeatures } from "./shared/use-set-features";

setEnv(env.FEATURES as string);

type OutletProps = ComponentProps<typeof Outlet>;

const RootWithErrorBoundary = (props: OutletProps) => {
  useSetFeatures();

  return <Outlet {...props} />;
};

export default RootWithErrorBoundary;
