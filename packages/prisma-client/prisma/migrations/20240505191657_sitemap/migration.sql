UPDATE
  "Build"
SET
  pages = jsonb_set(pages::jsonb, -- the original JSONB document
    '{folders}', -- path to the folders array
(
      SELECT
        jsonb_agg(
          CASE WHEN (folder ->> 'id' = 'root') THEN
            jsonb_insert(folder, '{children, -1}', '"iMOXsQzL_oBO98qTjwytF"'::jsonb, TRUE)
          ELSE
            folder
          END)
        FROM jsonb_array_elements(pages::jsonb -> 'folders') AS folder))::text
WHERE
  NOT pages::jsonb -> 'folders' @> '[{"id": "root", "children": ["iMOXsQzL_oBO98qTjwytF"]}]'::jsonb
  AND deployment IS NULL;

UPDATE
  "Build"
SET
  pages = jsonb_insert(pages::jsonb, '{pages, -1}', '{
      "id": "iMOXsQzL_oBO98qTjwytF",
      "name": "sitemap.xml",
      "title": "\"Un\"",
      "meta": {
        "description": "\"\"",
        "excludePageFromSearch": "true",
        "language": "\"\"",
        "socialImageUrl": "\"\"",
        "status": "200",
        "redirect": "\"\"",
        "custom": [{ "property": "", "content": "\"\"" }]
      },
      "rootInstanceId": "oeHZKV1ZnSTbxmWATkkHq",
      "systemDataSourceId": "OJe7i4TrskMeDmHNtQrHa",
      "path": "/sitemapxml"
    }'::jsonb, TRUE)::text
WHERE
  NOT pages::jsonb -> 'pages' @> '[{"id": "iMOXsQzL_oBO98qTjwytF"}]'::jsonb
  AND deployment IS NULL;

UPDATE
  "Build"
SET
  props =(props::jsonb || '[
  {
    "id": "Y930lTFU3tBX5FK5PY8Nm",
    "instanceId": "oHHnAHo0X89H9CygzMDrI",
    "name": "data",
    "type": "expression",
    "value": "$ws$dataSource$5IqA__DASH__HyoxSNibZ5gQZyVr.data"
  },
  {
    "id": "g37FghKQX55BVrMNPY5dK",
    "instanceId": "oHHnAHo0X89H9CygzMDrI",
    "name": "item",
    "type": "parameter",
    "value": "ndP1qLkJi_7ZrJIaXTSoA"
  },
  {
    "id": "cW2O7EhNK9VRu58zg2kSn",
    "instanceId": "3mEKIrzl7bgrr0HGbsBXH",
    "name": "tag",
    "type": "string",
    "value": "url"
  },
  {
    "id": "2Xd9HiEMHXQvZtihqzp2R",
    "instanceId": "Qk9DjDlD2wMnE4LkAyy7q",
    "name": "tag",
    "type": "string",
    "value": "loc"
  },
  {
    "id": "VT0bDdO5VZUe0YfVuAU7J",
    "instanceId": "Fqu2p2etkybMyvNcREf0B",
    "name": "tag",
    "type": "string",
    "value": "lastmod"
  },
  {
    "id": "JIgpTm3jIv0B6e-l2C5QB",
    "instanceId": "xqqdzI8mJs2WVepPtvL2L",
    "name": "tag",
    "type": "string",
    "value": "urlset"
  },
  {
    "id": "7DzqQoiRnnDCjIRhsZ6Zv",
    "instanceId": "xqqdzI8mJs2WVepPtvL2L",
    "name": "xmlns",
    "type": "string",
    "value": "http://www.sitemaps.org/schemas/sitemap/0.9"
  }
]'::jsonb)::text
WHERE
  NOT props::jsonb @> '[{"id": "Y930lTFU3tBX5FK5PY8Nm"}]'::jsonb
  AND deployment IS NULL;

UPDATE
  "Build"
SET
  instances =(instances::jsonb || '[
  {
    "type": "instance",
    "id": "oeHZKV1ZnSTbxmWATkkHq",
    "component": "Body",
    "children": [{ "type": "id", "value": "xqqdzI8mJs2WVepPtvL2L" }]
  },
  {
    "type": "instance",
    "id": "xqqdzI8mJs2WVepPtvL2L",
    "component": "XmlNode",
    "children": [{ "type": "id", "value": "oHHnAHo0X89H9CygzMDrI" }]
  },
  {
    "type": "instance",
    "id": "oHHnAHo0X89H9CygzMDrI",
    "component": "ws:collection",
    "label": "Sitemap",
    "children": [{ "type": "id", "value": "3mEKIrzl7bgrr0HGbsBXH" }]
  },
  {
    "type": "instance",
    "id": "3mEKIrzl7bgrr0HGbsBXH",
    "component": "XmlNode",
    "label": "url",
    "children": [
      { "type": "id", "value": "Qk9DjDlD2wMnE4LkAyy7q" },
      { "type": "id", "value": "Fqu2p2etkybMyvNcREf0B" }
    ]
  },
  {
    "type": "instance",
    "id": "Qk9DjDlD2wMnE4LkAyy7q",
    "component": "XmlNode",
    "label": "loc",
    "children": [
      {
        "type": "expression",
        "value": "$ws$dataSource$OJe7i4TrskMeDmHNtQrHa.origin + $ws$dataSource$ndP1qLkJi_7ZrJIaXTSoA.path"
      }
    ]
  },
  {
    "type": "instance",
    "id": "Fqu2p2etkybMyvNcREf0B",
    "component": "XmlNode",
    "label": "lastmod",
    "children": [
      {
        "type": "expression",
        "value": "$ws$dataSource$ndP1qLkJi_7ZrJIaXTSoA.lastModified"
      }
    ]
  }
]'::jsonb)::text
WHERE
  NOT instances::jsonb @> '[{"id": "oeHZKV1ZnSTbxmWATkkHq"}]'::jsonb
  AND deployment IS NULL;

UPDATE
  "Build"
SET
  "dataSources" =("dataSources"::jsonb || '[
  {
    "type": "parameter",
    "id": "OJe7i4TrskMeDmHNtQrHa",
    "scopeInstanceId": "oeHZKV1ZnSTbxmWATkkHq",
    "name": "system"
  },
  {
    "type": "resource",
    "id": "5IqA-HyoxSNibZ5gQZyVr",
    "scopeInstanceId": "oeHZKV1ZnSTbxmWATkkHq",
    "name": "sitemap.xml",
    "resourceId": "l2K0bQ7z2VyQQ2Q6j6OyR"
  },
  {
    "type": "parameter",
    "id": "He8Fjujjq3QNyCXGkEO17",
    "scopeInstanceId": "SpbLvr3rLrMGNi88JOavm",
    "name": "system"
  },
  {
    "type": "parameter",
    "id": "ndP1qLkJi_7ZrJIaXTSoA",
    "scopeInstanceId": "oHHnAHo0X89H9CygzMDrI",
    "name": "url"
  }
]'::jsonb)::text
WHERE
  NOT "dataSources"::jsonb @> '[{"id": "5IqA-HyoxSNibZ5gQZyVr"}]'::jsonb
  AND deployment IS NULL;

UPDATE
  "Build"
SET
  resources =(resources::jsonb || '[
  {
    "id": "l2K0bQ7z2VyQQ2Q6j6OyR",
    "name": "sitemap.xml",
    "method": "get",
    "url": "\"/$resources/sitemap.xml\"",
    "headers": []
  }
]'::jsonb)::text
WHERE
  NOT "resources"::jsonb @> '[{"id": "l2K0bQ7z2VyQQ2Q6j6OyR"}]'::jsonb
  AND deployment IS NULL;

