import {
  cliDocs,
  cliDocSections,
  cliDocTitles,
  type CliDocName,
} from "./docs.generated";

export const readCliDoc = (name: CliDocName) => cliDocs[name];

export const readCliDocTitle = (name: CliDocName) => cliDocTitles[name];

export const readCliDocSections = <Name extends keyof typeof cliDocSections>(
  name: Name
) => cliDocSections[name];
