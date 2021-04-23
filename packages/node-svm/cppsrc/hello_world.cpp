#include "hello_world.h"

std::string helloWorld::hello()
{
  return "Hi, I'm node-svm and this is jackass";
}

Napi::String helloWorld::HelloWrapped(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();
  Napi::String returnValue = Napi::String::New(env, helloWorld::hello());

  return returnValue;
}

Napi::Object helloWorld::Init(Napi::Env env, Napi::Object exports)
{
  exports.Set(
      "hello", Napi::Function::New(env, helloWorld::HelloWrapped));

  return exports;
}