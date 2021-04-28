# node-sentencepiece

Nodejs binding for sentencepiece tokenization.

> This is a link to the Google [sentencepiece](https://github.com/google/sentencepiece); an unsupervised text tokenizer and detokenizer mainly for Neural Network-based text generation systems where the vocabulary size is predetermined prior to the neural model training.

## Quick Start

**Prerequisites**: Yarn, node and cmake  
note : windows users also need [Build Tools for Visual Studio package](https://visualstudio.microsoft.com/fr/downloads/?rr=https%3A%2F%2Fwww.google.com%2F)

1. clone the repo using the `--recursive` arg to fetch [google/sentencepiece](https://github.com/google/sentencepiece) submodule
1. Run `yarn` to fetch node packages.
1. Run `yarn build` to build google/sentencepiece and the node binding
1. step outside the directory:  
   `>> cd ..`
1. run node:  
   `>> node`
1. require node-sentencepiece package  
   `(node) var sp = require('./node-sentencepiece')`
1. instanciate a processor  
   `(node) var proc = await makeProcessor()`
1. load a model  
   `(node) proc.loadModel('/path/to/model/m.model')`
1. use the processor to get tokens
   `(node) proc.encode('Never gonna give you up, Never gonna let you down')`

   returns:  
   `[ '▁', 'N', 'ever', '▁gonna', '▁give', '▁you', '▁up', ',', '▁', 'N', 'ever', '▁gonna', '▁let', '▁you', '▁down' ]`

1. you can get back the original input text from token by using the decode method

   `(node) var inputText = 'Feel the rain on your skin No one else can feel it for you'`

   `(node) var proc = new sp.Processor()`

   `(node) proc.loadModel('/path/to/model/m.model')`

   `(node) var pieces = proc.encode(inputText)`

   `(node) var outputText = proc.decode(pieces, modelPath)`

   `(node) inputText === outpuText`

   returns:  
   `true`
