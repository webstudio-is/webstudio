# Community Fork — Changes Over Upstream

Additions on the `develop` branch versus [webstudio-is/webstudio](https://github.com/webstudio-is/webstudio).

> **Maintainers**: add a row here whenever a community PR is merged into `develop`.
> When a contribution is accepted upstream, move its row(s) to the **Upstreamed** section.

---

## Self-hosting & Docker

| Commit                              | Description                                                        |
| ----------------------------------- | ------------------------------------------------------------------ |
| [`a61da5f`](../../commit/a61da5f30) | Add Docker build support and CI workflows                          |
| [`0ac7314`](../../commit/0ac731433) | Fix missing deps and build config for Docker                       |
| [`8468bc3`](../../commit/8468bc34d) | Fix MinIO S3 upload compatibility (`node:http` instead of `fetch`) |
| [`9db9f5b`](../../commit/9db9f5b2e) | Fix MinIO SigV4 signer: include port in signed URL                 |
| [`565c79c`](../../commit/565c79c3d) | Fix `updateStatus` re-verify using Domain + ProjectDomain tables   |

## Custom Domains

| Commit                              | Description                                                           |
| ----------------------------------- | --------------------------------------------------------------------- |
| [`7c87cc4`](../../commit/7c87cc436) | Real DNS TXT verification for self-hosted custom domains              |
| [`7a4ddd9`](../../commit/7a4ddd910) | Fix TXT record prefix (`_webstudio_is`)                               |
| [`f6a7efb`](../../commit/f6a7efba1) | Expose `customDomains` in `/rest/build/:buildId` response             |
| [`8e8c371`](../../commit/8e8c3e731) | Always re-verify TXT via DNS in `updateStatus`                        |
| [`7b53369`](../../commit/7b5336924) | Enable Entri domain setup without Pro plan requirement                |
| TBD                                 | Allow apex domain publishing; show A record instruction in builder UI |

## Publish / SSR–SSG

| Commit                              | Description                                                       |
| ----------------------------------- | ----------------------------------------------------------------- |
| [`d8c3850`](../../commit/d8c38508f) | Wire `SELF_HOSTED_PUBLISHER_URL` and add status callback endpoint |
| [`fae5106`](../../commit/fae510620) | Preserve original protocol in `parseBuilderUrl`                   |
| [`4af788c`](../../commit/4af788c68) | Persist build mode selection; clarify SSR/SSG labels              |
| [`be798f9`](../../commit/be798f916) | Add missing label clarifications for SSR/SSG                      |

## CI / Sync

| Commit                              | Description                                                        |
| ----------------------------------- | ------------------------------------------------------------------ |
| [`c53cc85`](../../commit/c53cc852a) | Auto-resolve `pnpm-lock.yaml` conflicts; open PR on rebase failure |
| [`e5f3d40`](../../commit/e5f3d4027) | Replace rebase with merge to preserve custom commits on `develop`  |
| [`86558d0`](../../commit/86558d0ef) | Use `WORKFLOW_PAT` for PR creation in sync job                     |
| [`b04cb67`](../../commit/b04cb678c) | Always run `merge-develop` when `develop` is behind `main`         |
| [`d4ce6dc`](../../commit/d4ce6dc9d) | Prefix Docker image tag on branch dispatch; cleanup on PR close    |
| [`2e41f0a`](../../commit/2e41f0adb) | Build Docker image on PR open/push with `pr-<N>` tag               |

## Technical Debt

| Commit                              | Description                          |
| ----------------------------------- | ------------------------------------ |
| [`74369fc`](../../commit/74369fc56) | Migrate build REST endpoints to tRPC |

---

## Upstreamed

| Commit | Description |
| ------ | ----------- |
| —      | —           |
