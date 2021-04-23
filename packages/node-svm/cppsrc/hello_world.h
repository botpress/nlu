#include <napi.h>
#include <vector>
#include <string>

namespace helloWorld
{
std::string hello();
Napi::String HelloWrapped(const Napi::CallbackInfo &info);
Napi::Object Init(Napi::Env env, Napi::Object exports);
}