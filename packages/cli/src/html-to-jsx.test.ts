import { test, expect } from "@jest/globals";
import * as React from "react";
import ReactDOMServer from "react-dom/server";
import esbuild from "esbuild";
import { htmlToJsx } from "./html-to-jsx";
import prettier from "prettier";

/**
 * Converts HTML to JSX, renders the JSX to HTML.
 */
const convertHtmlToJsxAndRenderToHtml = async (htmlCode: string) => {
  const jsxCode = htmlToJsx(htmlCode);

  const jsxComponentCode = `
  const Script = ({children, ...props}) => {
    if (children == null) {
      return <script {...props} />;
    }

    return <script {...props} dangerouslySetInnerHTML={{__html: children}} />;
  };

  const Style = ({children, ...props}) => {
    if (children == null) {
      return <style {...props} />;
    }

    return <style {...props} dangerouslySetInnerHTML={{__html: children}} />;
  };

  const MyComponent = () => (
    <>
    ${jsxCode}
    </>
  );`;

  const jsxCompiled = await esbuild.transform(jsxComponentCode, {
    loader: "jsx",
    format: "cjs",
  });

  const renderFunction = new Function(
    "React",
    "ReactDOMServer",
    `${jsxCompiled.code}; return ReactDOMServer.renderToString(React.createElement(MyComponent));`
  );

  const result = renderFunction(React, ReactDOMServer);

  return (
    result
      // replace to fix that renderToString(<input type="text" disabled />) results in <input type="text" disabled="">
      .replace(/\s(\w+)=""/g, " $1")
      // &amp; is replaced with & in attributes as its'ok
      .replace(/(?<=\w="[^"]*)&amp;(?=[^"]*")/g, "&")
      // renderToString can add comment <!-- -->
      .replace(/\n\s*<!-- -->/g, "")
      // <link rel="preload is set by react for all eager images
      .replace(/<link rel="preload".*\/>/g, "")
  );
};

const formatHtml = async (htmlCode: string) => {
  return await prettier.format(htmlCode, { parser: "html" });
};

test("Simple conversion works", async () => {
  const htmlCode = `
    <div id="1" class="hello world">Hello World</div>
    dsdsd
    <span>eee</span>
    <input type="text" disabled />
  `;
  const result = await convertHtmlToJsxAndRenderToHtml(htmlCode);

  expect(await formatHtml(htmlCode)).toBe(await formatHtml(result));
});

test("Simple script conversion works", async () => {
  const htmlCode = `
    <script>
      console.log('Hello World');
    </script>
  `;
  const result = await convertHtmlToJsxAndRenderToHtml(htmlCode);

  expect(await formatHtml(htmlCode)).toBe(await formatHtml(result));
});

test("Script conversion works with various chars", async () => {
  const htmlCode = `
    <script>
      const a = {
        z: 1,
        y: \`2\`,
      };

      console.log('</'+'Script>' + "ddd");

      const z = \`
      eee
      \`;
    </script>
  `;
  const result = await convertHtmlToJsxAndRenderToHtml(htmlCode);

  expect(await formatHtml(htmlCode)).toBe(await formatHtml(result));
});

test("Supports script src and meta", async () => {
  const htmlCode = `
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="hello/world" async defer></script>
  <script src="hello/world2"></script>
  `;
  const result = await convertHtmlToJsxAndRenderToHtml(htmlCode);

  expect(await formatHtml(htmlCode)).toBe(await formatHtml(result));
});

test("Should not fail", async () => {
  const htmlCode = `
   </s a="sd"><p><a><script src><scri pt>
  `;
  const result = await convertHtmlToJsxAndRenderToHtml(htmlCode);
  expect(result).toMatchInlineSnapshot(`
"
   <p><a><script src><scri pt>
  </script></a></p>"
`);
});

test("noscript works", async () => {
  const htmlCode = `
  <noscript><img height="1" width="1" style="display:none"
  src="https://www.facebook.com/tr?id=1045295173245773&ev=PageView&noscript=1"
  /></noscript>
  `;
  const result = await convertHtmlToJsxAndRenderToHtml(htmlCode);

  expect(await formatHtml(htmlCode)).toBe(await formatHtml(result));
});

test("Skip non modern brosers if", async () => {
  const htmlCode = `<!-- [if lt IE 9]><script>console.log('Hello World');</script><![endif] -->`;
  const result = await convertHtmlToJsxAndRenderToHtml(htmlCode);
  expect(result).toMatchInlineSnapshot(`""`);
});

test("Support styles", async () => {
  const htmlCode = `
  <style>
  .text-field[type="email"]:invalid + div,
  .text-field[type="email"]:invalid:focus + div,
  .text-field:valid + label, .form-field-secondary:valid + label
  {
      display: block;
      background-image: linear-gradient(180deg,#c8c7fe,#fbf8ff);
  }
  </style>

  <style>
  @font-face {
    font-family: "icons";
    src: url("data:application/x-font-ttf;charset=utf-8;base64,AAEAAAAA==") format("truetype");
    font-weight: normal;
    font-style: normal;
  }
  </style>
  `;

  const result = await convertHtmlToJsxAndRenderToHtml(htmlCode);

  expect(await formatHtml(htmlCode)).toBe(await formatHtml(result));
});

test("Real User Script Works", async () => {
  const htmlCode = `
  <script type="text/javascript">
  (function (C, A, L) { let p = function (a, ar) { a.q.push(ar); }; let d = C.document; C.Cal = C.Cal || function () { let cal = C.Cal; let ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; typeof namespace === "string" ? (cal.ns[namespace] = api) && p(api, ar) : p(cal, ar); return; } p(cal, ar); }; })(window, "https://app.cal.com/embed/embed.js", "init");
Cal("init", {origin:"https://cal.com"});

  Cal("floatingButton", {"calLink":"fedir-davydov/30min","hideButtonIcon":true,"buttonText":"Schedule free 30 min call","buttonColor":"#0F68EE","buttonTextColor":"#FAFAFB"});
  Cal("ui", {"styles":{"branding":{"brandColor":"#000000"}},"hideEventTypeDetails":false,"layout":"month_view"});
  </script>

  <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','GTM-EEE');</script>


  <script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '11111');
  fbq('track', 'PageView');
  </script>


  <script src="https://t.usermaven.com/lib.js"
      data-key="UMdXVreRwT"
      data-tracking-host="https://events.usermaven.com"
      data-autocapture="true"
      defer>
  </script>
  <script>window.usermaven = window.usermaven || (function(){(window.usermavenQ = window.usermavenQ || []).push(arguments);})</script>

  <noscript><img height="1" width="1" style="display:none"
  src="https://www.facebook.com/tr?id=11111&ev=PageView&noscript=1"
  /></noscript>

  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@splidejs/splide@4.1.4/dist/css/splide.min.css">

  <script type="module">
  import Chatbot from "https://cdn.jsdelivr.net/gh/ceelee/FlowiseChatEmbed@latest/dist/web.js"
  Chatbot.initFull({
      chatflowid: "",
      apiHost: "https://eee.eee-eee-eee-eee.com",
      theme: {
          chatWindow: {
              welcomeMessage: "Hi there! How can I help?",
          }
      }
  })
  </script>
  <script>
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    posthog.init('dsdsdsdsdsd',{api_host:'https://us.i.posthog.com', person_profiles: 'identified_only' // or 'always' to create profiles for anonymous users as well
        })
  </script>
  `;
  const result = await convertHtmlToJsxAndRenderToHtml(htmlCode);

  expect(await formatHtml(htmlCode)).toBe(await formatHtml(result));
});
