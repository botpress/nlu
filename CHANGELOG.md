## [0.1.2](https://github.com/botpress/nlu/compare/v0.1.1...v0.1.2) (2021-06-07)


### Bug Fixes

* **logger:** launcher debug logs are not displayed by default when verbose is 4 ([503f0d8](https://github.com/botpress/nlu/commit/503f0d8d040b00bf3fa1538acb2b6e40c4731f75))


### Features

* rename env config variable ([e886829](https://github.com/botpress/nlu/commit/e886829bc5b582f63e70a283406f1459b6f2821a))



## [0.1.1](https://github.com/botpress/nlu/compare/v0.1.0...v0.1.1) (2021-06-07)


### Bug Fixes

* no more argv in process fork because of pkg ([1b92c72](https://github.com/botpress/nlu/commit/1b92c72106f3140daf8820f6143c3ca63ea10034))



# [0.1.0](https://github.com/botpress/nlu/compare/v0.0.7...v0.1.0) (2021-06-07)


### Bug Fixes

* **build:** test Docker build ([a93d3f3](https://github.com/botpress/nlu/commit/a93d3f3d357e449b782d22af17625c510a1b155f))
* **build:** test Docker build ([29e3443](https://github.com/botpress/nlu/commit/29e34433de1e16353f96f6378b1305c926504975))
* **nlu:** remove database connection string from logs ([0dd1d76](https://github.com/botpress/nlu/commit/0dd1d763cc7eb45b520cbc37f4f6be4b65799dbb))
* **nlu:** remove database connection string from logs ([b2185b3](https://github.com/botpress/nlu/commit/b2185b3442ae80ad657e89d31934607e4d5c2b59))


### Features

* run list entity extraction on child threads with progress report ([#38](https://github.com/botpress/nlu/issues/38)) ([0ddc473](https://github.com/botpress/nlu/commit/0ddc4731365c5c9f98eea64d70491ee8ecadd25d))



## [0.0.7](https://github.com/botpress/nlu/compare/v0.0.6...v0.0.7) (2021-05-28)


### Bug Fixes

* **dx:** fix truncated change log in release body ([2641652](https://github.com/botpress/nlu/commit/2641652bf3b028d30a7407545702ec4e2d1a00dc))



## [0.0.6](https://github.com/botpress/nlu/compare/v0.0.5...v0.0.6) (2021-05-28)


### Features

* **dx:** add a gulp command to print changelog ([d6da961](https://github.com/botpress/nlu/commit/d6da96134f46c6808ea46d1d38fa36dbb46a5ee1))



## [0.0.5](https://github.com/botpress/nlu/compare/v0.0.4...v0.0.5) (2021-05-28)


### Features

* **dx:** gh action to create a release when needed ([d09b10b](https://github.com/botpress/nlu/commit/d09b10b856d86470265f0862c17e68ea133758be))



## [0.0.4](https://github.com/botpress/nlu/compare/v0.0.2...v0.0.4) (2021-05-27)

### Bug Fixes

- **api:** logger error when auth header error ([fcaf668](https://github.com/botpress/nlu/commit/fcaf668d94048e9bb3d26999e857ac0583eabf96))
- **api:** no need for min 1 context ([e17ae84](https://github.com/botpress/nlu/commit/e17ae84df4d9d1c9d2102ecf3c470547bcf35147))
- **engine:** spell-checker does not replace entities anymore ([0e0d75a](https://github.com/botpress/nlu/commit/0e0d75a8efa2bb00d9b5c3c08f5873cc66425251))
- **logger:** no log filter should log all messages ([86e693c](https://github.com/botpress/nlu/commit/86e693c579e5a2a88648dc9810f55821db69b00d))
- logger attach error no longuer throws ([b84f39a](https://github.com/botpress/nlu/commit/b84f39abd6eea9f8bdd56ec1dbaf5dad5a5e75d4))
- nanoid is default import from nanoid ([45ca517](https://github.com/botpress/nlu/commit/45ca517250002b230f455049a409867b60cc8836))

### Features

- add CLI arg to filter logs in console ([8c24bb5](https://github.com/botpress/nlu/commit/8c24bb522c4a81f599fe5dc349d06ae0fed1950f))
- add log filter to lang server also ([71c8df4](https://github.com/botpress/nlu/commit/71c8df46382e8eeeabe25c93bc6914d7d63c3918))
- allow setting model base path on fs ([4b816e0](https://github.com/botpress/nlu/commit/4b816e0dde2c5dcb568d731bbcb7d8080156450e))
- bring back lang-server, yargs and cli args ([74d7e1d](https://github.com/botpress/nlu/commit/74d7e1daf6d8f5ec4a0a237278e4e74656c87f70))
- display model location on start ([b2e086d](https://github.com/botpress/nlu/commit/b2e086d5760b45ba01d641e4da4f4fb72d4c0649))
- log filters param is an array ([be59069](https://github.com/botpress/nlu/commit/be590695976efb54a7cfb7f8e2e4cf9f8df3e8de))
- nlu server can take a config file path at CLI and override the rest of CLI ([2317814](https://github.com/botpress/nlu/commit/23178149a5f419538bd812353cc2db95d90883f3))
- **dx:** added a package.json script at root to run all jest tests ([0e0a4b3](https://github.com/botpress/nlu/commit/0e0a4b32919af84329a5b6f84ba70ff8a0be1b71))
