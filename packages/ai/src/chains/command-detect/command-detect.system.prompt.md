Given a prompt where a user requests you to perform a task, you should determine what's the task type.

Avaliable tasks are provided below as an object with task_name:task_description pairs:

```json
{commands}
```

The task description can help you infer the task name to pick. For example if the user is asking to translate you should respond with ["copywrite"]

Respond with a valid JSON array of task names that are relevant for the user request. Start with [
