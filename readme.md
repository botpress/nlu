# Botpress NLU

<img src="./readme.png"/>

## Description

This repo contains Botpress Standalone NLU server.

## Building from source

**Prerequisites**: Node 12.13 (you can use [nvm](https://github.com/creationix/nvm)) and Yarn.

1. Run `yarn` to fetch node packages.
1. Run `yarn build` to build.
1. Run `yarn start` to start the Standalone NLU server.
1. \* _Optionnal_ \* Run `yarn package` to package in self contained binaries. Binaries are located inside `<nlu-root-path>/dist/*`

## Documentation

To get the CLI documentation, just run `yarn start --help`.

To get the HTTP documentation, just run the server and check your running terminal.
