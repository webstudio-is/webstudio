import http from "k6/http";

export default function () {
  let response = http.request(
    "GET",
    "https://alpha.webstudio.is/designer/14b5b20a-a315-41a1-ac07-f64914ca8dec",
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
          "_session=eyJvYXV0aDI6c3RhdGUiOiI3ZmQ0ZTJkYy0wZWUzLTQ0ODktODdjNi0yODNkZGU5MmI5NGMiLCJ1c2VyIjp7ImlkIjoiY2NiOTU2MDMtMjY4OS00YzFjLTk5ODAtZjc4N2NmMmIyYzkwIiwiZW1haWwiOiJycG9taW5vdkBnbWFpbC5jb20iLCJwcm92aWRlciI6Imdvb2dsZSIsImltYWdlIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUxtNXd1MzQ5TjA4Qmt2NDdDUHd1SUU2MmZBQWszczYzbEtaRXB0ZjZ2bWY9czk2LWMiLCJ1c2VybmFtZSI6IlJvbWFuIFBvbWlub3YiLCJjcmVhdGVkQXQiOiIyMDIyLTEwLTA5VDA2OjQ3OjM5LjI5OVoiLCJ0ZWFtSWQiOiIwZDYzNWEzYy05OTk0LTQ0MjUtOWZkNy0zMTc5YzI4YjhiNTkifSwic3RyYXRlZ3kiOiJnb29nbGUifQ%3D%3D.p6PZGrlty6xaQA%2BtMMKz56acRdsov8D1uXRecNmiCnI; user-id=IjYzNTA1MjIzYTg3ZDQwMDAwOTE3YzNlOSI%3D",
        Referer: "https://webstudio.is/",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
    }
  );

  console.log(response.status);
}
