#include "predict_prob_worker.h"

PredictProbWorker::PredictProbWorker(
    struct svm_node *x,
    struct svm_model *model, // pointer
    Napi::Function &callback) : Napi::AsyncWorker(callback)
{
    this->x = x;
    this->model = model;
}

void PredictProbWorker::Execute()
{
    probs = new double[model->nr_class];
    prediction = svm_predict_probability(model, x, probs);
}

void PredictProbWorker::OnOK()
{
    Napi::Env env = Env();
    Napi::HandleScope scope(env);

    Napi::Object ret = Napi::Object::New(env);
    ret.Set("prediction", prediction);
    ret.Set("probabilities", arrayToNapi(env, probs, model->nr_class));

    delete[] x;
    delete[] probs;

    Callback().Call({ret});
}
