#include <napi.h>
#include "hello_world.h"
#include "nsvm.h"

Napi::Object InitAll(Napi::Env env, Napi::Object exports)
{
    helloWorld::Init(env, exports);
    NSVM::Init(env, exports);
    return exports;
}

NODE_API_MODULE(libsvmaddon, InitAll)