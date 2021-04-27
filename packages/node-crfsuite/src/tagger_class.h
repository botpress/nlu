#ifndef _TAGGER_CLASS_H_
#define _TAGGER_CLASS_H_

#include <napi.h>
#include <crfsuite_api.hpp>

class TaggerClass : public Napi::ObjectWrap<TaggerClass>
{
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  explicit TaggerClass(const Napi::CallbackInfo &info);

  /**
   * Destructor
   */
  ~TaggerClass()
  {
    delete tagger;
  }

private:
  static Napi::FunctionReference constructor;

  Napi::Value Open(const Napi::CallbackInfo &info);
  Napi::Value Close(const Napi::CallbackInfo &info);
  Napi::Value Tag(const Napi::CallbackInfo &info);
  Napi::Value GetLabels(const Napi::CallbackInfo &info);
  Napi::Value Marginal(const Napi::CallbackInfo &info);

  struct Error { std::string msg; };
  CRFSuite::ItemSequence GetItems(const Napi::CallbackInfo &info, struct Error & err);

  CRFSuite::Tagger *tagger;
};

#endif
