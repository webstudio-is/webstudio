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
          "value": "Welcome to Webstudio"
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
          "value": "Lorem ipsum dolor sit amet"
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
    }
  ],
  "props": [
    {
      "id": "prop-0",
      "instanceId": "id-Box-0",
      "name": "style",
      "required": false,
      "type": "string",
      "value": "width: 50%; float: left;"
    },
    {
      "id": "prop-1",
      "instanceId": "id-Box-1",
      "name": "style",
      "required": false,
      "type": "string",
      "value": "width: 50%; float: right;"
    }
  ]
}
```

Often though it adds props to instances:

```typescript
{
  "instances": [
    {
      "type": "instance",
      "id": "id-Box-1",
      "component": "Box",
      "children": [
        {
          "type": "text",
          "value": "Welcome to Webstudio"
        }
      ],
      "props": [
        {
          "id": "id-Box-1-0",
          "instanceId": "id-Box-1",
          "name": "className",
          "value": "left-column",
          "type": "string"
        }
      ]
    },
    {
      "type": "instance",
      "id": "id-Box-2",
      "component": "Box",
      "children": [
        {
          "type": "text",
          "value": "Lorem ipsum dolor sit amet, consectetur adipiscing elit."
        }
      ],
      "props": [
        {
          "id": "id-Box-2-0",
          "instanceId": "id-Box-2",
          "name": "className",
          "value": "right-column",
          "type": "string"
        }
      ]
    }
  ],
  "props": []
}
```

or it nests instances. Eg. a more complex request (omitting the context for brevity):

```
Can you create a page with a centered logo at the top. Right below there is the page title in bold, it is big. Below the title there is an horizontal navigation with 3 links: Home, About and Contact. Each link looks like a simple button with a stroke border, no round corners.

Finally below there is a grid of boxes, 3 per row. Each box looks like a card, with an image on top and below showing the Category, Post Title, Excerpt and author avatar. All the content is vertical.
```

Produces this nonsense:

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
          "value": ""
        },
        {
          "type": "instance",
          "value": "id-Box-1",
          "children": [
            {
              "type": "text",
              "value": ""
            },
            {
              "type": "instance",
              "value": "id-Box-2",
              "children": [
                {
                  "type": "text",
                  "value": ""
                },
                {
                  "type": "instance",
                  "value": "id-Box-3",
                  "children": [
                    {
                      "type": "id",
                      "value": "id-Text-0"
                    },
                    {
                      "type": "id",
                      "value": "id-Box-4"
                    }
                  ]
                }
              ]
            }
          ]
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
          "value": ""
        },
        {
          "type": "id",
          "value": "id-Text-1"
        },
        {
          "type": "text",
          "value": ""
        },
        {
          "type": "instance",
          "value": "id-Box-2",
          "children": [
            {
              "type": "text",
              "value": ""
            },
            {
              "type": "id",
              "value": "id-Box-5"
            }
          ]
        },
        {
          "type": "text",
          "value": ""
        },
        {
          "type": "instance",
          "value": "id-Box-6",
          "children": [
            {
              "type": "text",
              "value": ""
            },
            {
              "type": "id",
              "value": "id-Box-7"
            }
          ]
        },
        {
          "type": "text",
          "value": ""
        },
        {
          "type": "instance",
          "value": "id-Box-8",
          "children": [
            {
              "type": "text",
              "value": ""
            },
            {
              "type": "id",
              "value": "id-Box-9"
            }
          ]
        },
        {
          "type": "text",
          "value": ""
        }
      ]
    },
    {
      "type": "instance",
      "id": "id-Box-2",
      "component": "Box",
      "children": [
        {
          "type": "text",
          "value": ""
        },
        {
          "type": "id",
          "value": "id-Text-2"
        },
        {
          "type": "text",
          "value": ""
        },
        {
          "type": "instance",
          "value": "id-Box-5",
          "children": [
            {
              "type": "text",
              "value": ""
            },
            {
              "type": "instance",
              "value": "id-Box-10",
              "children": [
                {
                  "type": "text",
                  "value": ""
                },
                {
                  "type": "id",
                  "value": "id-Text-3"
                }
              ]

```
