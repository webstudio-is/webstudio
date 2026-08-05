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

const getReportMarker = (deduplicationKey: string) =>
  `<!-- webstudio-issue-report:${deduplicationKey} -->`;

const formatItems = (items: readonly string[]) =>
  items.map((item, index) => `${index + 1}. ${item}`).join("\n");

export const formatIssueReport = ({
  agent,
  category,
  deduplicationKey,
  report,
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

- MCP client: ${agent.client}${agent.clientVersion === undefined ? "" : ` ${agent.clientVersion}`}
- Provider: ${agent.provider ?? "unknown"}
- Model: ${agent.model}
- Reasoning effort: ${agent.reasoningEffort}
- Trigger: ${trigger}
- Category: ${category}

## Acceptance criteria

${formatItems(report.acceptanceCriteria)}
`;

const getJson = async <Result>(response: Response): Promise<Result> => {
  if (response.ok === false) {
    throw new Error(
      `GitHub issue reporting failed with HTTP ${response.status}.`
    );
  }
  return (await response.json()) as Result;
};

const getGitHubHeaders = (token: string) => ({
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${token}`,
  "X-GitHub-Api-Version": githubApiVersion,
});

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
  installationId,
  privateKey,
  request = fetch,
}: {
  appId: string;
  installationId: string;
  privateKey: string;
  request?: typeof fetch;
}) => {
  const response = await request(
    `https://api.github.com/app/installations/${encodeURIComponent(installationId)}/access_tokens`,
    {
      method: "POST",
      headers: getGitHubHeaders(createGitHubAppJwt({ appId, privateKey })),
    }
  );
  const result = await getJson<{ token?: unknown }>(response);
  if (typeof result.token !== "string" || result.token.length === 0) {
    throw new Error("GitHub App did not return an installation token.");
  }
  return result.token;
};

export const publishIssueReport = async (
  input: IssueReportInput,
  {
    repository,
    getInstallationToken,
    request = fetch,
  }: {
    repository: string;
    getInstallationToken: () => Promise<string>;
    request?: typeof fetch;
  }
): Promise<IssueReportResult> => {
  const [owner, name, ...extra] = repository.split("/");
  if (owner === undefined || name === undefined || extra.length > 0) {
    throw new Error("GitHub issue reporting repository must use owner/name.");
  }
  const token = await getInstallationToken();
  const headers = getGitHubHeaders(token);
  const searchUrl = new URL("https://api.github.com/search/issues");
  searchUrl.searchParams.set(
    "q",
    `repo:${repository} is:issue in:body "${getReportMarker(input.deduplicationKey)}"`
  );
  const search = await getJson<GitHubSearchResponse>(
    await request(searchUrl, { headers })
  );
  const existing = search.items?.[0];
  if (existing !== undefined) {
    return {
      status: "existing",
      issueNumber: existing.number,
      issueUrl: existing.html_url,
    };
  }

  const created = await getJson<GitHubIssue>(
    await request(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/issues`,
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          title: input.title,
          body: formatIssueReport(input),
        }),
      }
    )
  );
  return {
    status: "created",
    issueNumber: created.number,
    issueUrl: created.html_url,
  };
};

export const publishConfiguredIssueReport = async (input: IssueReportInput) => {
  const appId = env.GITHUB_ISSUE_REPORT_APP_ID;
  const installationId = env.GITHUB_ISSUE_REPORT_INSTALLATION_ID;
  const privateKey = env.GITHUB_ISSUE_REPORT_PRIVATE_KEY;
  if (
    appId === undefined ||
    installationId === undefined ||
    privateKey === undefined
  ) {
    throw new Error("GitHub issue reporting is not configured.");
  }
  return await publishIssueReport(input, {
    repository: env.GITHUB_ISSUE_REPORT_REPOSITORY,
    getInstallationToken: async () =>
      await createGitHubInstallationToken({
        appId,
        installationId,
        privateKey,
      }),
  });
};
