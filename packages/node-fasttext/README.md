# node-fasttext

> This project was originally forked from [this one](https://github.com/vunb/node-fasttext).

Nodejs binding for fasttext representation and classification.

> This is a link to the Facebook [fastText](https://github.com/facebookresearch/fastText). A Library for efficient text classification and representation learning.

- FASTTEXT_VERSION = 12;
- FASTTEXT_FILEFORMAT_MAGIC_INT32 = 793712314;

# fastText Classifier

According to [fasttext.cc](https://fasttext.cc/docs/en/supervised-tutorial.html). We have a simple classifier for executing prediction models about `cooking` from stackexchange questions:

```js
const path = require('path')
const fastText = require('@botpress/node-fasttext')

const model = path.resolve(__dirname, './model_cooking.bin')
const classifier = await makeClassifier(model)

classifier.predict('Why not put knives in the dishwasher?', 5).then((res) => {
  if (res.length > 0) {
    let tag = res[0].label // __label__knives
    let confidence = res[0].value // 0.8787146210670471
    console.log('classify', tag, confidence, res)
  } else {
    console.log('No matches')
  }
})
```

The model haved trained before with the followings params:

```js
const path = require('path')
const fastText = require('@botpress/node-fasttext')

let data = path.resolve(path.join(__dirname, '../data/cooking.train.txt'))
let model = path.resolve(path.join(__dirname, '../data/cooking.model'))

let classifier = await makeClassifier()
let options = {
  input: data,
  output: model,
  loss: 'softmax',
  dim: 200,
  bucket: 2000000
}

classifier.train('supervised', options).then((res) => {
  console.log('model info after training:', res)
  // Input  <<<<< C:\projects\node-fasttext\test\data\cooking.train.txt
  // Output >>>>> C:\projects\node-fasttext\test\data\cooking.model.bin
  // Output >>>>> C:\projects\node-fasttext\test\data\cooking.model.vec
})
```

Or you can train directly from the command line with fasttext builded from official source:

```bash
# Training
~/fastText/data$ ./fasttext supervised -input cooking.train -output model_cooking -lr 1.0 -epoch 25 -wordNgrams 2 -bucket 200000 -dim 50 -loss hs
Read 0M words
Number of words:  8952
Number of labels: 735
Progress: 100.0%  words/sec/thread: 1687554  lr: 0.000000  loss: 5.247591  eta: 0h0m 4m

# Testing
~/fastText/data$ ./fasttext test model_cooking.bin cooking.valid
N       3000
P@1     0.587
R@1     0.254
Number of examples: 3000
```

# Nearest neighbor

Simple class for searching nearest neighbors:

```js
const path = require('path')
const fastText = require('@botpress/node-fasttext')

const model = path.resolve(__dirname, './skipgram.bin')
const query = await makeQuery(model)

query.nn('word', 5, (err, res) => {
  if (err) {
    console.error(err)
  } else if (res.length > 0) {
    let tag = res[0].label // letter
    let confidence = res[0].value // 0.99992
    console.log('Nearest neighbor', tag, confidence, res)
  } else {
    console.log('No matches')
  }
})
```

# Build from source

See [Installation Prerequisites](https://github.com/nodejs/node-gyp#installation).

Make sure you checked-out fastText submodule: `git submodule update --init`

> If you're building for Linux, run `./linux-build.sh` before

```bash
# install dependencies and tools
yarn

# build node-fasttext from source
yarn build && yarn build:native
```

# Contributing

Pull requests and stars are highly welcome.

For bugs and feature requests, please [create an issue](https://github.com/botpress/nlu/issues/new).
