import { x } from "tinyexec";
import { prismaDir, schemaFilePath } from "./prisma-paths";

// https://www.prisma.io/docs/reference/api-reference/command-reference#migrate-diff
export const cliDiff = async () => {
  const { stdout } = await x(
    "prisma",
    [
      "migrate",
      "diff",
      `--from-schema-datasource=${schemaFilePath}`,
      `--to-schema-datamodel=${schemaFilePath}`,
      "--script",
    ],
    {
      nodeOptions: { cwd: prismaDir },
      throwOnError: true,
    }
  );
  return stdout;
};

// https://www.prisma.io/docs/reference/api-reference/command-reference#db-execute
export const cliExecute = async (filePath: string) => {
  await x(
    "prisma",
    ["db", "execute", `--file=${filePath}`, `--schema=${schemaFilePath}`],
    {
      nodeOptions: { cwd: prismaDir },
      throwOnError: true,
    }
  );
};
