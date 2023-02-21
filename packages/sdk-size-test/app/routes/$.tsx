import type {
  LinksFunction,
  LoaderArgs,
  MetaFunction,
} from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { InstanceRoot, Root } from "@webstudio-is/react-sdk";

export const meta: MetaFunction = () => {
  return { title: "test" };
};

export const links: LinksFunction = () => [];

export const loader = async ({ context, request }: LoaderArgs) => {
  return {};
};

export default function Index() {
  const data = useLoaderData<unknown>();

  const Outlet = () => <InstanceRoot data={data} />;
  return <Root Outlet={Outlet} />;
}
