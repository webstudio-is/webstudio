# A cloudflare worker to test the `mailchannels` handler from `@webstudio-is/form-handlers` package

We need it because:

As https://blog.cloudflare.com/sending-email-from-workers-with-mailchannels/ says:

> The only constraint currently is that the integration only works when the request comes from a Cloudflare IP address. So it won’t work yet when you are developing on your local machine or running a test on your build server.

So we cannot test mailchannels completely locally, but deploying temporarely via `wrangler dev` works.

To test:

1. `pnpm local-dev`
2. Open the url in the browser
