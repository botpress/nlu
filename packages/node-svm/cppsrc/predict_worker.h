#include <napi.h>
#include "../libsvm/svm.h"

class PredictWorker : public Napi::AsyncWorker
{
public:
    PredictWorker(struct svm_node *x,
                  struct svm_model *model, // pointer
                  Napi::Function &callback);

    void Execute();
    void OnOK();

private:
    struct svm_node *x;
    struct svm_model *model;
    int prediction = 0;
};