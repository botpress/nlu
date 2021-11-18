#include "binding-utils.h"

Napi::Array napi_utils::arrayToNapi(Napi::Env env, std::vector<double> array, unsigned int array_size)
{
  Napi::Array napiArray = Napi::Array::New(env);

  if (array.size() == 0)
  {
    return napiArray;
  }

  for (unsigned int i = 0; i < array_size; i++)
  {
    napiArray.Set(i, array[i]);
  }

  return napiArray;
}