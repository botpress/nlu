# Botpress Worker

tools for process and thread pools.

Prevent from rewriting the same scheduling and communication system every time we need to parallelize some task.

Offers functions and callback that makes handling a worker as easy as calling a function (or almost).

## The worker pool can:

- start a worker when none is already available
- wait for a worker to be free if max amount of worker reached
- cancel a task by sending a SIGKILL signal to the worker (only works if worker is a process)

## The worker entry point can:

- log a string message
- log task progress
- return task result
- throw an error
