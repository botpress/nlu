#include <napi.h>
#include "../libsvm/svm.h"
#include "utils.h"

class PredictProbWorker : public Napi::AsyncWorker
{
public:
    PredictProbWorker(struct svm_node *x,
                      struct svm_model *model,
                      Napi::Function &callback);

    void Execute();
    void OnOK();

private:
    struct svm_node *x;
    struct svm_model *model;
    double *probs;
    double prediction;
};