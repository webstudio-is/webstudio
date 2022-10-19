import minimist from "minimist";

export default minimist(process.argv.slice(2), {
  boolean: ["dev", "force"],
}) as { _: string[]; dev: boolean; force: boolean };
