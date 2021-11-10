#ifndef _TRAINING_WORKER_H_
#define _TRAINING_WORKER_H_

#include <string.h>
#include <napi.h>
#include <crfsuite_api.hpp>

#include "node_trainer.h"

struct ProgressData
{
  int32_t iteration;
};

class TrainingWorker : public Napi::AsyncProgressQueueWorker<struct ProgressData>
{
public:
  TrainingWorker(NodeTrainer *trainer, std::string path, Napi::Promise::Deferred deferred, const Napi::Function &cb);

  void Execute(const ExecutionProgress &progress);

  void OnOK();

  void OnProgress(const struct ProgressData *data, size_t count);

  Napi::Promise::Deferred deferred_;
  NodeTrainer *trainer_;
  std::string path_;
  int32_t status_;
};

#endif