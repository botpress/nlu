#include "predict_worker.h"

PredictWorker::PredictWorker(
    struct svm_node *x,
    struct svm_model *model, // pointer
    Napi::Function &callback) : Napi::AsyncWorker(callback)
{
    this->x = x;
    this->model = model;
}

void PredictWorker::Execute()
{
    prediction = svm_predict(model, x);
}

void PredictWorker::OnOK()
{
    Napi::Env env = Env();
    Napi::HandleScope scope(env);

    delete[] x;

    Napi::Number napiPrediction = Napi::Number::New(env, prediction);
    Callback().Call({napiPrediction});
}
