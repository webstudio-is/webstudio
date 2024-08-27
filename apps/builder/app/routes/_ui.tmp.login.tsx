import { type MetaFunction, useLoaderData } from "@remix-run/react";
import { json, type LoaderFunctionArgs } from "@remix-run/server-runtime";
import { authenticator } from "~/services/auth.server";
import { builderAuthenticator } from "~/services/builder-auth.server";
import { returnToCookie } from "~/services/cookie.server";
import { createContext } from "~/shared/context.server";
import {
  getAuthorizationServerOrigin,
  isBuilderUrl,
  parseBuilderUrl,
} from "~/shared/router-utils/origins";
import { builderUrlNew } from "~/shared/router-utils/path-utils";
import { createDebug } from "~/shared/debug";
import { ClientOnly } from "~/shared/client-only";

const debug = createDebug(import.meta.url);

export const meta: MetaFunction = () => {
  return [
    { title: "Temp login page (to delete)" },
    { name: "description", content: "Temp login page!" },
  ];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  debug("request.url", request.url);
  debug("isBuildUrl", isBuilderUrl(request.url));
  debug("Headers", [...request.headers.entries()]);
  debug("Origin", getAuthorizationServerOrigin(request.url));

  const context = await createContext(request);

  const projectData = await context.postgrest.client
    .from("Project")
    .select("id")
    .order("createdAt", { ascending: false })
    .limit(1)
    .single();
  if (projectData.error) {
    throw new Error(
      `Failed to fetch project data: ${projectData.error.message}`
    );
  }

  const projectId = isBuilderUrl(request.url)
    ? parseBuilderUrl(request.url).projectId!
    : process.env.NODE_ENV === "production"
      ? "264a609f-ce63-4197-a364-68d239c2f56a"
      : projectData.data.id;

  const user = isBuilderUrl(request.url)
    ? await builderAuthenticator.isAuthenticated(request)
    : await authenticator.isAuthenticated(request);

  const headers = new Headers();

  if (isBuilderUrl(request.url)) {
    debug("Temporary redirect to /tmp/login after login");
    const returnTo = request.url;
    headers.append("Set-Cookie", await returnToCookie.serialize(returnTo));
  }

  return json(
    {
      user,
      projectId,
      isBuilderUrl: isBuilderUrl(request.url),
      origin: getAuthorizationServerOrigin(request.url),
    },
    { headers }
  );
};

const TmpLogin = () => {
  const data = useLoaderData<typeof loader>();

  const projectUrl = new URL(
    builderUrlNew({
      origin: data.origin,
      projectId: data.projectId,
    })
  );

  projectUrl.pathname = "/tmp/login";

  const noAccessProjectUrl = new URL(
    builderUrlNew({
      origin: data.origin,
      projectId: "9ccd9600-de48-4f3f-898b-042e890ae805",
    })
  );

  noAccessProjectUrl.pathname = "/tmp/login";

  const fetchAllProjectIdsLoggedInAfterIssueDate = async (
    _userId: string,
    _issueDate: number
  ) => {
    return [
      {
        id: data.projectId,
      },
    ];
  };

  return (
    <ClientOnly>
      <div className="font-sans p-4">
        <h1 className="text-3xl">Welcome {data.user?.email ?? "Anon"}</h1>
        <ul className="list-disc mt-4 pl-6 space-y-2">
          {false === data.isBuilderUrl && (
            <>
              <li>
                <a
                  className="text-blue-700 underline visited:text-purple-900"
                  href={projectUrl.href}
                  rel="noreferrer"
                >
                  Project link
                </a>
              </li>
              {data.user != null && (
                <li>
                  <a
                    className="text-blue-700 underline visited:text-purple-900"
                    href="#"
                    rel="noreferrer"
                    onClick={async () => {
                      if (data.user == null) {
                        return;
                      }

                      const projectsToLogout =
                        await fetchAllProjectIdsLoggedInAfterIssueDate(
                          data.user.id,
                          0
                          // data.user.sessionIssueDate
                        );

                      // @todo use https://github.com/sindresorhus/p-all to execute in parallel like concurrency=5 stopOnError=false
                      // @todo remove /logout from rate limiter
                      for (const project of projectsToLogout) {
                        const logoutProjectUrl = new URL(
                          "/logout",
                          builderUrlNew({
                            origin: data.origin,
                            projectId: project.id,
                          })
                        );

                        console.info(`Logout ${logoutProjectUrl.href}`);

                        await fetch(logoutProjectUrl.href, {
                          method: "GET",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          redirect: "manual",
                          credentials: "include",
                        });
                      }
                    }}
                  >
                    Logout from AllProjects {data.user.email}
                  </a>
                </li>
              )}

              <li>
                <a
                  className="text-blue-700 underline visited:text-purple-900"
                  href={noAccessProjectUrl.href}
                  rel="noreferrer"
                >
                  Project link you have no access to
                </a>
              </li>
            </>
          )}
          {false === data.isBuilderUrl && data.user == null && (
            <li>
              <a
                className="text-blue-700 underline visited:text-purple-900"
                href={"/login"}
                rel="noreferrer"
              >
                Login at authorizer app
              </a>
            </li>
          )}

          {false === data.isBuilderUrl && data.user != null && (
            <li>
              <a
                className="text-blue-700 underline visited:text-purple-900"
                href={"/logout"}
                rel="noreferrer"
              >
                Logout at authorizer app
              </a>
            </li>
          )}

          {data.isBuilderUrl && (
            <>
              <li>
                <a
                  className="text-blue-700 underline visited:text-purple-900"
                  href={`${data.origin}/tmp/login`}
                  rel="noreferrer"
                >
                  Goto Auth Server
                </a>
              </li>

              <li>
                <a
                  className="text-blue-700 underline visited:text-purple-900"
                  href={"/auth/ws"}
                  rel="noreferrer"
                >
                  Run Project Login
                </a>
              </li>
              {data.user != null && (
                <li>
                  <a
                    className="text-blue-700 underline visited:text-purple-900"
                    href={"/logout"}
                    rel="noreferrer"
                  >
                    Run Project Logout
                  </a>
                </li>
              )}
            </>
          )}
        </ul>
      </div>
    </ClientOnly>
  );
};

export default TmpLogin;
