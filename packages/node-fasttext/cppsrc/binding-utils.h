#include <napi.h>
#include <iostream>
#include <vector>
#include <string>

namespace napi_utils
{
  Napi::Array arrayToNapi(Napi::Env env, std::vector<double> array, unsigned int array_size);
}