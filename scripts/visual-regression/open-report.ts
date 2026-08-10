import { spawn } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const openVisualReport = (reportPath: string) => {
  const command =
    process.platform === "darwin"
      ? { file: "open", args: [reportPath] }
      : process.platform === "win32"
        ? { file: "cmd", args: ["/c", "start", "", reportPath] }
        : { file: "xdg-open", args: [reportPath] };

  const child = spawn(command.file, command.args, {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
};

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  openVisualReport(path.resolve(".visual-regression/report/index.html"));
}
