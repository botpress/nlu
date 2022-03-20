# Botpress Model Transfer Server

Web Server responsible for model weights download and upload.

## Available Routes

```js
/**
 * Download Model Weights.
 * @returns model weights
 */
'GET <base-url>/:modelUUID'

/**
 * Cancels a training.
 * @body model weights
 * @returns file UUID and ttl before the file is deleted
 */
'POST <base-url>/'

```

## Licensing

This software is protected by the same license as the [main Botpress repository](https://github.com/botpress/botpress). You can find the license file [here](https://github.com/botpress/botpress/blob/master/LICENSE).
