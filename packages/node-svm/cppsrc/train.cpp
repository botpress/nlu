#include "train.h"

void no_print(const char *) {}

bool train::train(struct svm_parameter &params,
                  struct NsvmState *state,
                  struct TrainingResult &results)
{
    const char *check_result = svm_check_parameter(state->problem, &params);
    if (check_result != NULL)
    {
        std::stringstream ss;
        ss << "SVM training parameters format is not OK. Inner error is: '" << check_result << "'";
        results.error_reason = ss.str();
        return false;
    }

    if (state->mute)
    {
        void (*print_func)(const char *) = no_print;
        svm_set_print_string_function(print_func);
    }

    std::mt19937 rnd_gen;
    if (state->isSeeded) {
        rnd_gen.seed(state->randomSeed);
    } else {
        rnd_gen.seed(time(0));
    }

    svm_model *model = svm_train(state->problem, &params, rnd_gen);

    if (model->nr_class < 2)
    {
        std::stringstream ss;
        ss << "SVM training dataset has " << model->nr_class << " class which is invalid.";
        results.error_reason = ss.str();
        return false;
    }

    if (params.svm_type == ONE_CLASS && params.probability)
    {
        results.error_reason = "Probablity prediction with svm_type=ONE_CLASS is not supported";
        return false;
    }

    state->model = model;
    state->modelIsTrained = true;

    results.error_reason = "";
    return true;
}