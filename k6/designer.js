import http from "k6/http";

export default function () {
  let response = http.request(
    "GET",
    "https://webstudio-designer-git-testnotformerge-webstudio-is.vercel.app/designer/9fcbbbd6-f684-4868-89f1-3a039b2c24cf",
    // "https://webstudio-designer-git-testnotformerge-webstudio-is.vercel.app/rest/noop",
    null,
    {
      headers: {
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "accept-language": "en-GB,en-US;q=0.9,en;q=0.8,ru;q=0.7",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "sec-gpc": "1",
        "upgrade-insecure-requests": "1",
        cookie:
          "_session=eyJ1c2VyIjp7ImlkIjoiNWY5MWIwYzMtOGYxYy00ZmM2LWIzZGItZGI0MTc2YmRmODYzIiwiZW1haWwiOiJoZWxsb0B3ZWJzdHVkaW8uaXMiLCJwcm92aWRlciI6ImRldiIsImltYWdlIjoiIiwidXNlcm5hbWUiOiJhZG1pbiIsImNyZWF0ZWRBdCI6IjIwMjItMDktMDlUMDk6MzI6MjIuNDE1WiIsInRlYW1JZCI6ImRmM2I1OTc5LWY4OTEtNDVmNi1iNGFhLWYyNzZiMDQ1NmJlNiJ9LCJzdHJhdGVneSI6ImZvcm0ifQ%3D%3D.Na%2BVf27MOCCoNteh4bvoZqqPKE3uCFfYBbyiyM%2Ffdzs",
      },
    }
  );

  console.log(response.status);
}
