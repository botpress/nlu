# Node-SVM-NAPI

## What

This package is a nodejs binding for [Libsvm](https://github.com/cjlin1/libsvm).

It's strongly inspired by [node-svm](https://github.com/nicolaspanel/node-svm), but shares no lines of code with it and has a fairly different API.

It's developed and maintained by the [botpress](https://github.com/botpress/botpress) team which is by far the best conversational AI platform there is for nodejs environment (probably the best conversational AI platform there is at all).

## Why

Why did we make a complete reimplementation? What is different from previous [node-svm](https://github.com/nicolaspanel/node-svm) ? There's actually two reasons:

1. [node-svm](https://github.com/nicolaspanel/node-svm) doesn't build for nodejs version > 10...

   It's written using [Native Abstractions for Node.js (nan)](https://github.com/nodejs/nan) which is an old API for node binding developpement.

   Our binding is written using [node-addon-api (napi)](https://github.com/nodejs/node-addon-api) which is intended to insulate addons from changes in the underlying JavaScript engine…

2. [node-svm](https://github.com/nicolaspanel/node-svm) is not a simple wrapper, it does add some extra logic which we don't think a node binding should be doing. Our binding is a much simpler wrapper and add no unnecessary logic to [Libsvm](https://github.com/cjlin1/libsvm).

## Installation

To install locally in a project, simply type command

```
  npm install node-svm-napi
```

## Usage

Here's an example of how to use

```js
const { makeSvm } = require('@botpress/node-svm')

async function main() {
  const svm = await makeSvm()

  const train_params = {
    svm_type: 0,
    kernel_type: 2,
    degree: 3,
    gamma: 0.5,
    coef0: 0.0,
    cache_size: 100,
    eps: 0.1,
    C: 1.0,
    nr_weight: 0,
    weight_label: [0, 0],
    weight: [0.0, 0.0],
    nu: 0.5,
    p: 0.0,
    shrinking: 1,
    probability: 0
  }

  const x = [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1]
  ]

  const y = [0, 1, 1, 0]

  svm.train(train_params, x, y)

  const model_object = svm.get_model() // this is equivalent to the svm_model object of libsvm
  console.log(model_object)
  svm.set_model(model_object) // for testing purposes (not mandatory)

  const prediction = svm.predict([1, 1]) // outputs 0
  console.log('prediction', prediction)
}

main()
  .then(() => console.log('Done.'))
  .catch(err => console.log(err))
```

For more examples check out [/test-js](https://github.com/botpress/node-svm-napi/tree/master/tests-js) directory which contains unit tests and few performance tests.

For more details about training parameters, check out [cjlin1/libsvm](https://github.com/cjlin1/libsvm) readme file.

## Typescript

For typescript usage, checkout the [nsvm.d.ts](https://github.com/botpress/node-svm-napi/blob/master/nsvm.d.ts) file at the project's root directory.

## Contributing

Feel free to open a PR to contribute this project, but before doing so, make sure there's no regression in your code. You can run unit tests with command `yarn test`. Also, you should run memory_test.js for at least an hour without the process memory consumption increasing.
