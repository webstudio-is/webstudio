```json
{
  "instances": [
    {
      "type": "instance",
      "id": "id-Box-0",
      "component": "Box",
      "children": [
        {
          "type": "text",
          "value": "sidebar"
        }
      ]
    },
    {
      "type": "instance",
      "id": "id-Box-1",
      "component": "Box",
      "children": [
        {
          "type": "text",
          "value": "main content"
        }
      ]
    },
    {
      "type": "instance",
      "id": "id-Box-2",
      "component": "Box",
      "children": [
        {
          "type": "id",
          "value": "id-Box-0"
        },
        {
          "type": "id",
          "value": "id-Box-1"
        }
      ]
    },
    {
      "type": "instance",
      "id": "id-Body-0",
      "component": "Body",
      "children": [
        {
          "type": "id",
          "value": "id-Box-2"
        }
      ]
    }
  ],
  "styleSourceSelections": [
    {
      "instanceId": "id-Box-0",
      "values": ["ss-local-0"]
    },
    {
      "instanceId": "id-Box-1",
      "values": ["ss-local-1"]
    }
  ],
  "styleSources": [
    {
      "type": "local",
      "id": "ss-local-0"
    },
    {
      "type": "local",
      "id": "ss-local-1"
    }
  ],
  "styles": [
    {
      "styleSourceId": "ss-local-0",
      "breakpointId": "bp-0",
      "property": "width",
      "value": {
        "type": "unit",
        "unit": "%",
        "value": 20
      }
    },
    {
      "styleSourceId": "ss-local-1",
      "breakpointId": "bp-0",
      "property": "width",
      "value": {
        "type": "unit",
        "unit": "%",
        "value": 80
      }
    },
    {
      "styleSourceId": "ss-local-0",
      "breakpointId": "bp-0",
      "property": "float",
      "value": {
        "type": "keyword",
        "value": "left"
      }
    },
    {
      "styleSourceId": "ss-local-1",
      "breakpointId": "bp-0",
      "property": "float",
      "value": {
        "type": "keyword",
        "value": "left"
      }
    }
  ]
}
```
