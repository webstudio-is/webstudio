import { cliDocs, type CliDocName } from "./docs.generated";

export const readCliDoc = (name: CliDocName) => cliDocs[name];
