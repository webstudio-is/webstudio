import { schema } from "./schema/schema";
import { graphql } from "graphql";
// import type { AllInputTypes } from "nexus";

export const query = async () => {
  const rootValue: NexusGen["rootTypes"]["Query"] = {
    pages: [
      {
        id: "1",
        name: "nexus",
        title: "Nexus",
        path: "nexus",
        rootInstanceId: "1",
        meta: {},
      },
    ],
  };

  const variableValues: NexusGen["argTypes"]["Query"]["pages"] = {
    where: {
      property: "a",
      in: ["a", "b"],
    },
  };

  const res = await graphql({
    schema,
    source: `
      query pages {
        pages {
          id
          name
          title
          path
          meta {
            custom {
              property
              content
            }
          }
        }
      }
    `,

    contextValue: {
      x: "x",
    },
    // operationName: "pages",
    rootValue,
    variableValues,
  });

  console.log(JSON.stringify(res));
};

await query();
