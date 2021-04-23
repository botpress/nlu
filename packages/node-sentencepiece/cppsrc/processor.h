#include <napi.h>
#include <vector>
#include <string>
#include "sentencepiece_processor.h"

class Processor : public Napi::ObjectWrap<Processor> {
 public:
  static void Init(Napi::Env env, Napi::Object exports);
  Processor(const Napi::CallbackInfo& info);

 private:
  static Napi::FunctionReference constructor;
  Napi::Value encode(const Napi::CallbackInfo& info);
  Napi::Value decode(const Napi::CallbackInfo& info);
  void loadModel(const Napi::CallbackInfo& info);
  sentencepiece::SentencePieceProcessor * actualProcessor;
};