# Botpress NLU

<img src="./readme.gif"/>

## Description

This repo contains every ML/NLU related code written by Botpress in the NodeJS environment.

The source code is structured in a mono-repo fashion using yarn workspaces. The `./packages` directory contains all available packages. The main packages are:

- [nlu-server](./packages/nlu-server/readme.md): Contains the Botpress Standalone NLU Server
- [lang-server](./packages/lang-server/readme.md): Contains the Botpress Language Server
- [nlu-bin](./packages/nlu-bin/readme.md): Small CLI to use as an entry point for both `nlu-server` and `lang-server`

Check out each individual packages for more details.

## Running from source

**Prerequisites**: Node 16.13 (you can use [nvm](https://github.com/creationix/nvm)) and Yarn.

1. Run `yarn` to fetch node packages.
1. Run `yarn build && yarn start` to build and start the Standalone NLU server.
1. You can also run `yarn dev` to run the NLU Server with [ts-node](https://github.com/TypeStrong/ts-node) however, trainings won't be parallelized on several threads.

## Running from pre-built binaries

New executable binary files are packaged at every release. You can download those directly on release page located [here](https://github.com/botpress/nlu/releases).

## Telemetry

### Metrics (Prometheus)

A Prometheus endpoint can be configured to expose NLU specific metrics. By setting the `PROMETHEUS_ENABLED` environment variables to `true`, the port `9090` will expose prometheus metrics.

### Tracing (Jaeger)

A [Jaeger](https://www.jaegertracing.io/) client can be configured using a subset of the standard Opentelemetry [environment variables](https://opentelemetry.io/docs/reference/specification/sdk-environment-variables).

The important environment variables for configuring tracing are:

- TRACING_ENABLED bool Enables the tracer
- TRACING_DEBUG bool Adds debug information about the tracing configuration
- OTEL_EXPORTER_JAEGER_ENDPOINT url Sets the Jaeger collector endpoint
- OTEL_SERVICE_NAME string Sets the service name given to a trace
- OTEL_SERVICE_VERSION string Sets the current running version of the service
- OTEL_SERVICE_VERSION_INSTANCE_ID string Sets the node intance id on which the service is running on
- OTEL_SERVICE_NAMESPACE string Sets the namespace of the service
- OTEL_DEPLOYMENT_ENVIRONMENT string Sets the environment of the service

## ⚠️⚠️ Disclaimer ⚠️⚠️

The NLU Server does **not** enforce authentication in any way. This means it is completely exposed to many attacks. If you plan on using the nlu-server in your local Botpress setup, makes sure it is not publicly exposed. If you plan on exposing the NLU server, make sure it his hidden behind a reverse proxy which ensures a proper authentication. This reverse proxy should:

- Ensure each appId (`X-App-Id` header) is unique.
- Ensure a user with appId `user1` can't call the nlu server with header `X-App-Id` set to anything other than `user1`.
- Ensure only calls with a registered appId can call the nlu server except maybe for the `GET /info` route.

The NLU Server's only purpose is to do NLU.

## Licensing

Different liscences may apply to differents packages of the [./packages](https://github.com/botpress/nlu/tree/master/packages) directory. If no liscence is specified, the package is protected by the same license as the [main Botpress repository](https://github.com/botpress/botpress). You can find the license file [here](https://github.com/botpress/botpress/blob/master/LICENSE).
