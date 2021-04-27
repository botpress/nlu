
#ifndef VEC_WORKER_H
#define VEC_WORKER_H

#include <napi.h>
#include "wrapper.h"
#include "binding-utils.h"

class VecWorker : public Napi::AsyncWorker
{
public:
  VecWorker(
      std::string query,
      Wrapper *wrapper,
      Napi::Promise::Deferred deferred,
      Napi::Function &callback);

  Napi::Promise::Deferred deferred_;

  void Execute();
  void OnOK();
  void OnError(const Napi::Error &e);

private:
  std::string query_;
  Wrapper *wrapper_;
  std::vector<double> result_;
};

#endif
