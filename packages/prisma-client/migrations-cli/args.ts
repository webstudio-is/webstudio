import minimist from "minimist";

export default minimist(process.argv.slice(2), {
  boolean: ["dev", "skip-confirmation"],
}) as { _: string[]; dev: boolean; "skip-confirmation": boolean };
