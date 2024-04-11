import { json, useLoaderData } from "@remix-run/react";

export const loader = async () => {
  return json({
    b: process.env.BRANCH_NAME,
  });
};

const Comp = () => {
  const data = useLoaderData<typeof loader>();
  return <div>Branch: {data.b}</div>;
};

export default Comp;
