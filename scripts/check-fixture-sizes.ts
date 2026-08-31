import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const fixtureLimits = [
  ["./fixtures/ssg-cloudflare-pages/dist/client", 356],
  ["./fixtures/react-router-netlify/build/client", 376],
  ["./fixtures/webstudio-features/build/client", 3684],
] as const;

const results = await Promise.all(
  fixtureLimits.map(async ([directory, maxSize]) => {
    const { stdout } = await execFileAsync("du", ["-sk", directory]);
    const size = Number.parseInt(stdout, 10);
    return {
      directory,
      size,
      diff: size - maxSize,
      passed: size <= maxSize,
    };
  })
);

for (const result of results) {
  const difference = result.diff > 0 ? `+${result.diff}` : result.diff;
  const message = `${result.directory}: ${result.size}kB (${difference}kB)`;
  if (result.passed) {
    console.info(message);
  } else {
    console.error(`\n${message}`);
  }
}

if (results.some((result) => result.passed === false)) {
  console.error("Some fixtures exceeded limits");
  process.exitCode = 1;
}
