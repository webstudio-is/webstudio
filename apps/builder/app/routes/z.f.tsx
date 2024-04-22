import { json, type ActionFunctionArgs } from "@remix-run/server-runtime";
import { Body } from "@webstudio-is/sdk-components-react-remix";
import { db } from "@webstudio-is/project/index.server";

export default function Logout() {
  return <h1>HELLO</h1>;
}
// https://vercel.com/docs/functions/runtimes#max-duration
export const loader = async ({ request }: ActionFunctionArgs) => {
  console.info("db", db, Body);
  return json({});
};

export const config = {
  maxDuration: 30,
};
