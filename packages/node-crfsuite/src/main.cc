#include <crfsuite.hpp>
#include <napi.h>
#include "trainer_class.h"
#include "tagger_class.h"

Napi::Object Initialize(Napi::Env env, Napi::Object exports)
{
  TrainerClass::Init(env, exports);
  TaggerClass::Init(env, exports);
  return exports;
}

NODE_API_MODULE(crfsuite, Initialize)
