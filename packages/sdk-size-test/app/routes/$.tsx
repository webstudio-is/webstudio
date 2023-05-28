import { useLoaderData } from "@remix-run/react";
import { InstanceRoot, Root } from "@webstudio-is/react-sdk";
import { components } from "../page-components/page-main";

export default function Index() {
  const data = useLoaderData<unknown>();

  const Outlet = () => <InstanceRoot data={data} components={components} />;
  return <Root Outlet={Outlet} />;
}
