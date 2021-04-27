#ifndef NSVM_STATE_H
#define NSVM_STATE_H

struct NsvmState
{
    struct svm_problem *problem;
    struct svm_model *model;
    unsigned int nSamples;
    unsigned int nFeatures;
    uint32_t randomSeed;
    bool isSeeded;
    bool modelIsTrained;
    bool mute;
};

#endif