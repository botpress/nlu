#include <napi.h>
#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include "utils.h"
#include "../libsvm/svm.h"
#include "type_check.h"
#include "train.h"
#include "nsvm_state.h"

class NSVM : public Napi::ObjectWrap<NSVM>
{
public:
    static void Init(Napi::Env env, Napi::Object exports);
    NSVM(const Napi::CallbackInfo &info);
    ~NSVM();
    Napi::Value svmTrain(const Napi::CallbackInfo &info);
    Napi::Value svmPredict(const Napi::CallbackInfo &info);
    Napi::Value svmPredictProbability(const Napi::CallbackInfo &info);
    Napi::Value setModel(const Napi::CallbackInfo &info);
    Napi::Value getModel(const Napi::CallbackInfo &info);
    Napi::Value freeModel(const Napi::CallbackInfo &info);
    Napi::Value isTrained(const Napi::CallbackInfo &info);

private:
    void free();

    static Napi::FunctionReference constructor;
    struct NsvmState *_state;
};