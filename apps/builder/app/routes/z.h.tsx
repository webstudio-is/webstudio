import { json, type ActionFunctionArgs } from "@remix-run/server-runtime";

export default function Logout() {
  return <h1>HELLO</h1>;
}
// https://vercel.com/docs/functions/runtimes#max-duration
export const loader = async ({ request }: ActionFunctionArgs) => {
  await new Promise((resolve) => setTimeout(resolve, 20000));
  return json({});
};

export const config = {
  maxDuration: 30,
};
