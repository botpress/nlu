franc:
    - repair tests
    - bring back bitfan
    - bring back node bindings

cc:
    - package a binary
    - package npm : "@botpress/nlu"
        {
            startNLUServer(config): Promise<void>, 
            startLangServer(config): Promise<void>, ./bp lang
            makeNLUClient(config): Client
        }