import type { ActionFunctionArgs } from "@remix-run/server-runtime";

export default function Logout() {
  return <h1>HELLO</h1>;
}

export const loader = async ({ request }: ActionFunctionArgs) => {
  await new Promise((resolve) => setTimeout(resolve, 20000));
};
