#include "vecWorker.h"
#include "node-util.h"

VecWorker::VecWorker(std::string query,
                     Wrapper *wrapper,
                     Napi::Promise::Deferred deferred,
                     Napi::Function &callback) : AsyncWorker(callback), deferred_(deferred)
{
  this->query_ = query;
  this->wrapper_ = wrapper;
}

void VecWorker::Execute()
{
  try
  {
    wrapper_->loadModel();
    wrapper_->precomputeWordVectors();
    result_ = this->wrapper_->getWordVector(query_);
  }
  catch (std::string errorMessage)
  {
    SetError(errorMessage.c_str());
  }
  catch (const char *str)
  {
    SetError(str);
  }
  catch (const std::exception &e)
  {
    SetError(e.what());
  }
}

void VecWorker::OnError(const Napi::Error &e)
{
  Napi::HandleScope scope(Env());
  Napi::String error = Napi::String::New(Env(), e.Message());
  deferred_.Reject(error);

  // Call empty function
  Callback().Call({error});
}

void VecWorker::OnOK()
{
  Napi::Env env = Env();
  Napi::HandleScope scope(env);
  Napi::Array result = napi_utils::arrayToNapi(env, result_, result_.size());

  deferred_.Resolve(result);

  // Call empty function
  if (!Callback().IsEmpty())
  {
    Callback().Call({env.Null(), result});
  }
}
