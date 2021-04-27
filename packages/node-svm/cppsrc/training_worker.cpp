#include "training_worker.h"

TrainingWorker::TrainingWorker(
    struct svm_parameter &params,
    struct NsvmState *state,
    Napi::Function &callback) : Napi::AsyncWorker(callback)
{
    this->params = params;
    this->state = state;
}

void TrainingWorker::Execute()
{
    struct train::TrainingResult results = {""};
    if (!train::train(params, state, results))
    {
        SetError(results.error_reason);
    }
}

void TrainingWorker::OnOK()
{
    Napi::Env env = Env();
    Napi::HandleScope scope(env);
    Callback().Call({env.Null()});
}

void TrainingWorker::OnError(const Napi::Error &e)
{
    Napi::HandleScope scope(Env());
    Napi::String error = Napi::String::New(Env(), e.Message());
    Callback().Call({error});
}