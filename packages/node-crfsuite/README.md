# node-crfsuite

**This repo was originally forked from [this guy](https://github.com/vunb/node-crfsuite).**

A nodejs binding for crfsuite

> This is a link to the CRFSuite library written by Naoaki Okazaki. CRF or Conditional Random Fields are a class of statistical modeling method often applied in pattern recognition and machine learning and used for structured prediction.

# Installation

For most "standard" use cases (on Mac, Linux, or Windows on a x86 or x64 processor), `node-crfsuite` will install easy with:

> npm install crfsuite

# Usage

## CRFSuite Tagger

```js
const crfsuite = require("crfsuite");
const tagger = new crfsuite.Tagger();

let is_opened = tagger.open("./path/to/crf.model");
console.log("File model is opened:", is_opened);

let tags = tagger.tag(input);
console.log("Tags: ", tags);
```

## CRFSuite Trainer

```js
const path = require("path");
const crfsuite = require("crfsuite");
const trainer = new crfsuite.Trainer({
  debug: true,
});

let model_filename = path.resolve("./model.crfsuite");

let xseq = [["walk"], ["walk", "shop"], ["clean", "shop"]];
let yseq = ["sunny", "sunny", "rainy"];

// submit training data to the trainer
trainer.append(xseq, yseq);
trainer.train(model_filename);

// output: ./model.crfsuite
```

# Installation Special Cases

We use [node-pre-gyp](https://github.com/mapbox/node-pre-gyp) to compile and publish binaries of the library for most common use cases (Linux, Mac, Windows on standard processor platforms). If you have a special case, `node-crfsuite` will work, but it will compile the binary during the install. Compiling with nodejs is done via [node-gyp](https://github.com/nodejs/node-gyp) which requires Python 2.x, so please ensure you have it installed and in your path for all operating systems. Python 3.x will not work.

- See [node-gyp installation prerequisites](https://github.com/nodejs/node-gyp#installation).

## Build from source

```bash
# clone the project
git clone --recursive https://github.com/botpress/node-crfsuite-napi.git

# go to working folder
cd node-crfsuite-napi

# install dependencies and build the binary
npm install
```

For development:

```bash
# rebuild
npm run build

# run unit-test
yarn test
```

<<<<<<< HEAD

# Contributing

Pull requests and stars are highly welcome.

# For bugs and feature requests, please [create an issue](https://github.com/botpress/node-crfsuite-napi/issues/new).

> > > > > > > fl_update
