To run:

```
$ k6 run -u {max_concurrent_requests} -i {total_request} {script}.js
```

Example:

```
$ k6 run -u 1 -i 100 empty.js
```
