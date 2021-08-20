# Botpress Locks

Contains locks and transaction queues to prevent many kinds of race conditions

Race conditions can occur:

- in single-threaded apps when using asynchronous code
- in multi-threaded/multi-process apps
- in mutli-instances apps
