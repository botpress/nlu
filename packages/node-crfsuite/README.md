# node-crfsuite

> This project was originally forked from [this one](https://github.com/vunb/node-crfsuite)

A nodejs binding for crfsuite

> This is a link to the CRFSuite library written by Naoaki Okazaki. CRF or Conditional Random Fields are a class of statistical modeling method often applied in pattern recognition and machine learning and used for structured prediction.

# Usage

## CRFSuite Tagger

```js
const crfsuite = require('@botpress/node-crfsuite')
const tagger = await makeTagger()

let is_opened = tagger.open('./path/to/crf.model')
console.log('File model is opened:', is_opened)

let tags = tagger.tag(input)
console.log('Tags: ', tags)
```

## CRFSuite Trainer

```js
const path = require('path')
const crfsuite = require('@botpress/node-crfsuite')
const trainer = await makeTrainer({
  debug: true
})

let model_filename = path.resolve('./model.crfsuite')

let xseq = [['walk'], ['walk', 'shop'], ['clean', 'shop']]
let yseq = ['sunny', 'sunny', 'rainy']

// submit training data to the trainer
trainer.append(xseq, yseq)
trainer.train(model_filename)

// output: ./model.crfsuite
```

# Installation Special Cases

We use [node-pre-gyp](https://github.com/mapbox/node-pre-gyp) to compile and publish binaries of the library for most common use cases (Linux, Mac, Windows on standard processor platforms). If you have a special case, `node-crfsuite` will work, but it will compile the binary during the install. Compiling with nodejs is done via [node-gyp](https://github.com/nodejs/node-gyp) which requires Python 2.x, so please ensure you have it installed and in your path for all operating systems. Python 3.x will not work.

- See [node-gyp installation prerequisites](https://github.com/nodejs/node-gyp#installation).

## Build from source

```bash
# clone the project
git clone --recursive https://github.com/botpress/nlu.git

# go to working folder
cd nlu/packages/node-crfsuite

# install dependencies and build the binary
yarn
```

For development:

```bash
# rebuild
yarn build && yarn build:native

# run unit-test
yarn test
```

<<<<<<< HEAD

# Contributing

Pull requests and stars are highly welcome.

# For bugs and feature requests, please [create an issue](https://github.com/botpress/nlu/issues/new).
