# Botpress NLU Engine

## Description

Contains all Botpress NLU Pipeline and tools packaged under very few classes and functions.

The `makeEngine()` function returns an instance of class `Engine` which is reponsible for:

- training of a model
- prediction using a model
- spawning and handling training process
- spawning and handling training threads
- keeping loaded models in an in-memory cache
- handling file-system caches at provided path
- comunicating via HTTP with language server and duckling server

It is not responsible for:

- models persistency
- training state persistency
- hosting an HTTP API
- HA / multi-clustering
