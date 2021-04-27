#include <napi.h>
#include "processor.h"

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  Processor::Init(env, exports);
  return exports;
}

NODE_API_MODULE(testaddon, InitAll)