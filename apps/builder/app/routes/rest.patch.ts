import { type Patch } from "immer";
import type { ActionFunctionArgs } from "@remix-run/server-runtime";
import type { SyncItem } from "immerhin";
import { Prisma, prisma } from "@webstudio-is/prisma-client";
import { type Build } from "@webstudio-is/project-build";
import { patchAssets } from "@webstudio-is/asset-uploader/index.server";
import type { Project } from "@webstudio-is/project";
import { authorizeProject } from "@webstudio-is/trpc-interface/index.server";
import { createContext } from "~/shared/context.server";
import { publicStaticEnv } from "~/env/env.static";

type PatchData = {
  transactions: Array<SyncItem>;
  buildId: Build["id"];
  projectId: Project["id"];
  version: number;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const {
      buildId,
      projectId,
      transactions,
      version: clientVersion,
    }: PatchData = await request.json();

    const version = new URL(request.url).searchParams.get("client-version");

    if (publicStaticEnv.VERSION !== version) {
      return {
        status: "version_mismatched",
        errors: `The client and server versions do not match. ${version} != ${publicStaticEnv.VERSION}`,
      };
    }

    if (buildId === undefined) {
      return { errors: "Build id required" };
    }
    if (projectId === undefined) {
      return { errors: "Project id required" };
    }

    const lastTransactionId = transactions.at(-1)?.transactionId;

    if (lastTransactionId === undefined) {
      return { errors: "Transaction array must not be empty." };
    }

    const context = await createContext(request);
    const canEdit = await authorizeProject.hasProjectPermit(
      { projectId, permit: "edit" },
      context
    );
    if (canEdit === false) {
      throw Error("You don't have edit access to this project");
    }

    const jsonFields = {
      pages: "object",
      instances: "map",
      styleSourceSelections: "styleSourceSelections",
      styleSources: "map",
      styles: "styles",
      props: "map",
      dataSources: "map",
      breakpoints: "map",
      resources: "map",

      marketplaceProduct: "map",
    } as const;

    const isJsonField = (
      namespace: string
    ): namespace is keyof typeof jsonFields => namespace in jsonFields;

    const patchesByField: Partial<Record<keyof typeof jsonFields, Patch[]>> =
      {};

    let doSocialImageUpdate = false;

    for await (const transaction of transactions) {
      for await (const change of transaction.changes) {
        const { namespace, patches } = change;
        if (patches.length === 0) {
          continue;
        }

        if (namespace === "assets") {
          // assets implements own patching
          // @todo parallelize the updates
          // currently not possible because we fetch the entire tree
          // and parallelized updates will cause unpredictable side effects
          await patchAssets({ projectId }, patches, context);
          continue;
        }

        if (false === isJsonField(namespace)) {
          return { errors: `Unknown namespace "${namespace}"` };
        }

        patchesByField[namespace] = [
          ...(patchesByField[namespace] ?? []),
          ...patches,
        ];

        if (namespace === "pages") {
          doSocialImageUpdate = true;
        }
      }
    }

    const rawSet = Object.entries(patchesByField).map(
      ([field, patches], index) =>
        Prisma.sql`${Prisma.raw(`"${field}"`)} = patch_map(${Prisma.raw(`"${field}"`)}, ${jsonFields[field as keyof typeof jsonFields]}, ${JSON.stringify(patches)})`
    );

    rawSet.push(Prisma.sql`"version" = ${clientVersion + 1}`);
    rawSet.push(Prisma.sql`"lastTransactionId" = ${lastTransactionId}`);

    // eslint-disable-next-line no-console
    console.time("updateQueryPatch");

    const updateQuery = Prisma.sql`
      UPDATE "Build"
      SET
      ${Prisma.join(rawSet, ", ")}
      WHERE
        id = ${buildId} AND
        "projectId" = ${projectId} AND
        "version" = ${clientVersion} AND
        "deployment" IS NULL
    `;

    const count = await prisma.$executeRaw(updateQuery);

    // eslint-disable-next-line no-console
    console.timeEnd("updateQueryPatch");

    if (count === 0) {
      const build = await prisma.build.findUnique({
        select: { version: true, lastTransactionId: true },
        where: { id_projectId: { projectId, id: buildId } },
      });

      if (build === null) {
        throw Error(`Build ${buildId} not found`);
      }

      // Check if a retry attempt is made with a previously successful transaction.
      // This can occur if the connection was lost or an error occurred post-transaction completion,
      // leaving the client in an erroneous state and prompting a retry.
      if (lastTransactionId === build.lastTransactionId) {
        console.info("Last transaction id matches");
        return { status: "ok" };
      }

      console.error({
        status: "version_mismatched",
        errors: `The client and server versions do not match. ${build.version} != ${clientVersion}`,
        buildId,
      });

      return {
        status: "version_mismatched",
        errors: `The client and server versions do not match. ${build.version} != ${clientVersion}`,
      };
    }

    if (doSocialImageUpdate) {
      const updateSocialImage = Prisma.sql`
        UPDATE "Project"
        SET "previewImageAssetId" = b.pages::json->'homePage'->'meta'->>'socialImageAssetId'
        FROM "Build" b
        WHERE "Project".id = b."projectId" AND
        b.id = ${buildId}
      `;
      await prisma.$executeRaw(updateSocialImage);
    }

    return { status: "ok" };
  } catch (e) {
    console.error(e);
    return { errors: e instanceof Error ? e.message : JSON.stringify(e) };
  }
};

// Reduces Vercel function size from 29MB to 9MB for unknown reasons; effective when used in limited files.
export const config = {
  maxDuration: 30, // seconds
};
