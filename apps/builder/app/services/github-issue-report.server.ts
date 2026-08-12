import { createSign } from "node:crypto";
import type {
  IssueReportInput,
  IssueReportResult,
} from "@webstudio-is/protocol";
import env from "~/env/env.server";

type GitHubIssue = {
  number: number;
  html_url: string;
};

type GitHubSearchResponse = {
  items?: GitHubIssue[];
};

const githubApiVersion = "2022-11-28";
const reportRepository = "webstudio-is/webstudio";

const getReportMarker = (deduplicationKey: string) =>
  `<!-- webstudio-issue-report:${deduplicationKey} -->`;

const formatItems = (items: readonly string[]) =>
  items.map((item, index) => `${index + 1}. ${item}`).join("\n");

const formatRuntime = (runtime: IssueReportInput["runtime"]) =>
  [
    "## Technical runtime",
    "",
    `- CLI: ${runtime?.cliVersion ?? "unknown"}`,
    `- Node.js: ${runtime?.nodeVersion ?? "unknown"}`,
    ...(runtime === undefined
      ? []
      : [
          `- Operating system: ${runtime.os} ${runtime.osVersion} (${runtime.architecture})`,
          `- Execution mode: ${runtime.executionMode}`,
          `- API contract: ${runtime.apiContractVersion}`,
        ]),
  ].join("\n");

export const formatIssueReport = ({
  agent,
  category,
  deduplicationKey,
  report,
  runtime,
  trigger,
}: IssueReportInput) => `${getReportMarker(deduplicationKey)}

## User story

${report.userStory}

## Summary

${report.summary}

## What the agent tried

${formatItems(report.attemptedWorkflow)}

## Expected behavior

${report.expectedBehavior}

## Actual result

${report.actualResult}

## Recovery attempts

${formatItems(report.recoveryAttempts)}

## User impact

${report.userImpact}

## Technical context

${report.technicalContext}

## Agent environment

- Client: ${agent.client}${agent.clientVersion === undefined ? "" : ` ${agent.clientVersion}`}
- Provider: ${agent.provider ?? "unknown"}
- Model: ${agent.model}
- Reasoning effort: ${agent.reasoningEffort}
- Trigger: ${trigger}
- Category: ${category}

${formatRuntime(runtime)}

## Acceptance criteria

${formatItems(report.acceptanceCriteria)}
`;

const requestGitHub = async <Result>({
  body,
  method,
  path,
  request,
  token,
}: {
  body?: object;
  method?: "GET" | "POST";
  path: string;
  request: typeof fetch;
  token: string;
}) => {
  const response = await request(new URL(path, "https://api.github.com"), {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": githubApiVersion,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (response.ok === false) {
    throw new Error(
      `GitHub issue reporting failed with HTTP ${response.status}.`
    );
  }
  return (await response.json()) as Result;
};

const encodeJwtPart = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

export const createGitHubAppJwt = ({
  appId,
  privateKey,
  now = Date.now(),
}: {
  appId: string;
  privateKey: string;
  now?: number;
}) => {
  const issuedAt = Math.floor(now / 1000) - 60;
  const unsignedToken = [
    encodeJwtPart({ alg: "RS256", typ: "JWT" }),
    encodeJwtPart({ iss: appId, iat: issuedAt, exp: issuedAt + 10 * 60 }),
  ].join(".");
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();
  const signature = signer
    .sign(privateKey.split("\\n").join("\n"))
    .toString("base64url");
  return `${unsignedToken}.${signature}`;
};

export const createGitHubInstallationToken = async ({
  appId,
  createJwt = createGitHubAppJwt,
  privateKey,
  request = fetch,
}: {
  appId: string;
  createJwt?: typeof createGitHubAppJwt;
  privateKey: string;
  request?: typeof fetch;
}) => {
  const appJwt = createJwt({ appId, privateKey });
  const installation = await requestGitHub<{ id?: unknown }>({
    path: `/repos/${reportRepository}/installation`,
    request,
    token: appJwt,
  });
  if (typeof installation.id !== "number") {
    throw new Error("GitHub App installation was not found.");
  }
  const result = await requestGitHub<{ token?: unknown }>({
    method: "POST",
    path: `/app/installations/${installation.id}/access_tokens`,
    request,
    token: appJwt,
  });
  if (typeof result.token !== "string" || result.token.length === 0) {
    throw new Error("GitHub App did not return an installation token.");
  }
  return result.token;
};

export const publishIssueReport = async (
  input: IssueReportInput,
  {
    getInstallationToken,
    request = fetch,
  }: {
    getInstallationToken: () => Promise<string>;
    request?: typeof fetch;
  }
): Promise<IssueReportResult> => {
  const token = await getInstallationToken();
  const searchUrl = new URL("https://api.github.com/search/issues");
  searchUrl.searchParams.set(
    "q",
    `repo:${reportRepository} is:issue in:body "${getReportMarker(input.deduplicationKey)}"`
  );
  const search = await requestGitHub<GitHubSearchResponse>({
    path: `${searchUrl.pathname}${searchUrl.search}`,
    request,
    token,
  });
  const existing = search.items?.[0];
  if (existing !== undefined) {
    return {
      status: "existing",
      issueNumber: existing.number,
      issueUrl: existing.html_url,
    };
  }

  const created = await requestGitHub<GitHubIssue>({
    method: "POST",
    path: `/repos/${reportRepository}/issues`,
    request,
    token,
    body: {
      title: input.title,
      body: formatIssueReport(input),
    },
  });
  return {
    status: "created",
    issueNumber: created.number,
    issueUrl: created.html_url,
  };
};

export const publishConfiguredIssueReport = async (input: IssueReportInput) => {
  const appId = env.GITHUB_ISSUE_REPORT_APP_ID;
  const privateKey = env.GITHUB_ISSUE_REPORT_PRIVATE_KEY;
  if (appId === undefined || privateKey === undefined) {
    throw new Error("GitHub issue reporting is not configured.");
  }
  return await publishIssueReport(input, {
    getInstallationToken: async () =>
      await createGitHubInstallationToken({
        appId,
        privateKey,
      }),
  });
};
