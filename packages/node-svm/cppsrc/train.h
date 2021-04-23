#ifndef TRAIN_H
#define TRAIN_H

#include <napi.h>
#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include "utils.h"
#include "nsvm_state.h"
#include "../libsvm/svm.h"

namespace train
{
    bool train(struct svm_parameter &params,
               struct NsvmState *state,
               struct TrainingResult &results);

    struct TrainingResult
    {
        std::string error_reason;
    };
} // namespace train

#endif