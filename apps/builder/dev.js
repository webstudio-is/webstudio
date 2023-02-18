const { watch } = require("node:fs");
const { spawn } = require("node:child_process");

let childProcess = null;

const startServer = () => {
  if (childProcess) {
    childProcess.kill();
  }
  childProcess = spawn("node", ["./server-express"], {
    stdio: "inherit",
    env: process.env,
  });
};

startServer();
watch("./api/index.js", startServer);
