import { LogoutPage } from "./logout.client";
import { RequestFixture } from "./storybook/request-fixture";

const pendingLogout = (request: Request) => {
  if (new URL(request.url).pathname === "/storybook/logout") {
    return new Promise<Response>(() => {});
  }
};

export default { title: "Logout" };

export const Pending = () => (
  <RequestFixture request={pendingLogout}>
    <LogoutPage logoutUrls={["/storybook/logout"]} />
  </RequestFixture>
);
