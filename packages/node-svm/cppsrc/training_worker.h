#include <napi.h>
#include "train.h"

class TrainingWorker : public Napi::AsyncWorker
{
public:
    TrainingWorker(struct svm_parameter &params, // copy
                   struct NsvmState *state,      // pointer
                   Napi::Function &callback);

    void Execute();
    void OnOK();
    void OnError(const Napi::Error &e);

private:
    struct svm_parameter params;
    struct NsvmState *state;
};