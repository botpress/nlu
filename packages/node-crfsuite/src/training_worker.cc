#include "training_worker.h"

TrainingWorker::TrainingWorker(NodeTrainer *trainer, std::string path, Napi::Promise::Deferred deferred, const Napi::Function &cb)
    : Napi::AsyncProgressQueueWorker<struct ProgressData>(cb), trainer_(trainer), path_(path), deferred_(deferred)
{
}

void TrainingWorker::Execute(const ExecutionProgress &progress)
{
  std::function<void(const int32_t iteration)> progressCb = [progress](const int32_t iteration) {
    struct ProgressData data = {iteration};
    progress.Send(&data, 1);
  };

  trainer_->progress_callback = progressCb;
  status_ = trainer_->train(path_, -1);
}

void TrainingWorker::OnOK()
{
  Napi::Env env = Env();
  Napi::HandleScope scope(env);
  deferred_.Resolve(Napi::Number::New(env, status_));
}

void TrainingWorker::OnProgress(const struct ProgressData *data, size_t count)
{
  Napi::Env env = Env();
  Napi::HandleScope scope(env);
  Napi::Number napiIt = Napi::Number::New(env, data->iteration);
  Napi::Value napiRes = Callback().Call({napiIt});
  if (napiRes.IsNumber())
  {
    int32_t res = napiRes.As<Napi::Number>().Uint32Value();
    if (res != 0)
    {
      trainer_->cancelTraining();
    }
  }
}
