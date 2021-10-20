## [0.1.8](https://github.com/botpress/nlu/compare/v0.1.7...v0.1.8) (2021-10-20)


### Bug Fixes

* **nlu-cli:** upgrade version of nlu-cli to match root version ([#112](https://github.com/botpress/nlu/issues/112)) ([d08ac79](https://github.com/botpress/nlu/commit/d08ac79714aa39ccaa8df4cabbaa40f0012811bd))
* **nlu-engine:** only few languages are space separated ([#114](https://github.com/botpress/nlu/issues/114)) ([98c84ef](https://github.com/botpress/nlu/commit/98c84ef7a944e53fb507af225a6f65687538601a))



## [0.1.7](https://github.com/botpress/nlu/compare/v0.1.6...v0.1.7) (2021-10-06)


### Bug Fixes

* **nlu-server:** models were never stored on database even when dburl was defined ([#107](https://github.com/botpress/nlu/issues/107)) ([c017884](https://github.com/botpress/nlu/commit/c01788445e30f2e194bbda2c589fd7e8b8f7fadd))
* check for APP_DATA_PATH environment variable ([#101](https://github.com/botpress/nlu/issues/101)) ([2bd043a](https://github.com/botpress/nlu/commit/2bd043a4463b10d43e894a9fa770cf4150d3c23a))



## [0.1.6](https://github.com/botpress/nlu/compare/v0.1.5...v0.1.6) (2021-09-13)


### Features

* **nlu-server:** display build information on startup ([022d498](https://github.com/botpress/nlu/commit/022d4989d2be1247cdd000240a15bc56797f4217))



## [0.1.5](https://github.com/botpress/nlu/compare/1.0.0-rc.1...0.1.5) (2021-09-01)


### Bug Fixes

* **nlu-engine:** launch intent trainings in parallel and log each ctx ([d9b8152](https://github.com/botpress/nlu/commit/d9b81528bd3580634736ef9628db61a8f1121573))
* **nlu-engine:** launch svm trainings one after the other ([a7dcad0](https://github.com/botpress/nlu/commit/a7dcad00562ac737af81514abb3911b1c855200e))
* **nlu-engine:** use a stratified kfold to limit the amount of grid search iterations ([4197e78](https://github.com/botpress/nlu/commit/4197e7834a1e95ea5aeb7ed757fea18b05df3065))



## [0.1.4](https://github.com/botpress/nlu/compare/v0.1.3...v0.1.4) (2021-08-20)


### Bug Fixes

* **apm:** renamed sentry references to apm ([b07f312](https://github.com/botpress/nlu/commit/b07f3122a212a306a855c0099caffa7c54bc57c0))
* **bitfan:** bring back e2e tests and datasets ([7f12f2f](https://github.com/botpress/nlu/commit/7f12f2fd5e201757c7692706b2307e0b5d0ed68b))
* **lint:** applied linting to code ([774d32c](https://github.com/botpress/nlu/commit/774d32c4f5b414ebd4d22cbd8b4de027feee5f62))
* **sentry:** use sentry enabled instead of DSN for the configuration ([e89301c](https://github.com/botpress/nlu/commit/e89301cb5d633b6ba9649bb0d9164235885e9308))
* **style:** fix codestyle for tests, lint & formatting ([c9c572a](https://github.com/botpress/nlu/commit/c9c572a76110c6c54ef8a60bd727ae33e65eb018))
* **worker:** fix node typings to pass environement variables correctly when spawning new thread ([#76](https://github.com/botpress/nlu/issues/76)) ([853a3f3](https://github.com/botpress/nlu/commit/853a3f3d7de38471cf4539dc395c6bf7b8ee9a27))
* run unit tests of all yarn packages from the root ([26670d3](https://github.com/botpress/nlu/commit/26670d30de797f3fa8c95b55330270157a79f1d1))
* **style:** fix codestyle for tests, lint & formatting ([cacbf94](https://github.com/botpress/nlu/commit/cacbf948a5f8589ce5bfd6402d3578b48c816497))
* undefined logger in slot tagger ([b2c688d](https://github.com/botpress/nlu/commit/b2c688dbef69fbda677adc701a23843f47504499))


### Features

* **apm:** added Sentry to the NLU server ([bf23d66](https://github.com/botpress/nlu/commit/bf23d665f146dc9d3582d6e8f2bbb275664951c1))
* **apm:** added Sentry to the NLU server ([72b458a](https://github.com/botpress/nlu/commit/72b458ab89ac014b871625035b43121e12a8f795))
* **nlu-client:** allow nlu client extension by setting attributes to protected ([ee36ae7](https://github.com/botpress/nlu/commit/ee36ae7d4eb6b3ede0c7588595c139719f48ce21))



## [0.1.3](https://github.com/botpress/nlu/compare/v0.1.2...v0.1.3) (2021-07-07)


### Bug Fixes

* exact matcher now works even with different entities ([#56](https://github.com/botpress/nlu/issues/56)) ([6c14b8c](https://github.com/botpress/nlu/commit/6c14b8ce6b14398fcdc621455382c0e18aaa0570))
* **training:** porgress now won't skip steps ([#55](https://github.com/botpress/nlu/issues/55)) ([4073d61](https://github.com/botpress/nlu/commit/4073d617edf19d683833ee8394ead2376c94fdfa))


### Features

* **dx:** added a CLI command to download a language model in a given language ([#58](https://github.com/botpress/nlu/issues/58)) ([64e7871](https://github.com/botpress/nlu/commit/64e78714ed47bf90744ba1dbf0ee300fd1a632a2))
* **e2e:** configurable NLU server endpoint ([50fd701](https://github.com/botpress/nlu/commit/50fd701111fb6ea3fb93772db12ee629df7de9cd))
* **e2e:** configurable NLU server endpoint ([dd71ea0](https://github.com/botpress/nlu/commit/dd71ea04311944dd7170611c9940222b80a7250f))
* **nlu-server:** App tests ([b7c2cc2](https://github.com/botpress/nlu/commit/b7c2cc25b5afe3b557b64239f908788d5b76e091))



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
