import { Prisma, prisma, type Project } from "@webstudio-is/prisma-client";
import {
  authorizeProject,
  type AppContext,
  AuthorizationError,
} from "@webstudio-is/trpc-interface/index.server";

export const cloneAssets = async (
  {
    fromProjectId,
    toProjectId,
    checkPermissions = true,
  }: {
    fromProjectId: Project["id"];
    toProjectId: Project["id"];

    /**
     * Don't use unless absolutely have to (e.g. because of transactions)
     * and unless it's obvious on the call project that permission is checked
     */
    checkPermissions?: boolean;
  },
  context: AppContext,
  client: Prisma.TransactionClient = prisma
) => {
  if (checkPermissions) {
    const canView = await authorizeProject.hasProjectPermit(
      { projectId: fromProjectId, permit: "view" },
      context
    );

    if (canView === false) {
      throw new AuthorizationError(
        "You don't have access to this project assets"
      );
    }

    const canEdit = await authorizeProject.hasProjectPermit(
      { projectId: toProjectId, permit: "edit" },
      context
    );

    if (canEdit === false) {
      throw new AuthorizationError(
        "You don't have access to create this project assets"
      );
    }
  }

  const assetFields = Object.keys(client.asset.fields);

  const assetFieldsFiltered = assetFields.filter(
    (field) => field !== "projectId"
  );

  const selectQuery = Prisma.sql`
    SELECT
    ${Prisma.raw(
      assetFieldsFiltered.map((field) => `a."${field}"`).join(", ")
    )}, ${toProjectId} as "projectId"
    FROM "Asset" a, "File" f
    WHERE
      a.name = f.name AND
      f.status = 'UPLOADED' AND
      a."projectId" = ${fromProjectId}`;

  const insertQuery = Prisma.sql`
    INSERT INTO "Asset"(${Prisma.raw(
      assetFieldsFiltered.map((field) => `"${field}"`).join(", ")
    )}, "projectId") ${selectQuery}
  `;

  await client.$executeRaw(insertQuery);
};
