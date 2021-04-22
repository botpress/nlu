- bring back node bindings
- repair tests
- package a binary
- package npm : "@botpress/nlu"
    {
        startNLUServer(config): Promise<void>, 
        startLangServer(config): Promise<void>, ./bp lang
        makeNLUClient(config): Client
    }