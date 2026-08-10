import { spawn } from "node:child_process";
import path from "node:path";

const reportPath = path.resolve(".visual-regression/report/index.html");
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
