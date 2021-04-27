#include <napi.h>
#include <iostream>
#include <vector>
#include <string>
#include "../libsvm/svm.h"

void napiToSvmModel(const Napi::Object &napiModel, svm_model &model);
Napi::Object svmModelToNapi(const Napi::Env &env, const svm_model &model, unsigned int nSamples, unsigned int nFeatures);

void napiToSvmParameters(const Napi::Object &napiParams, svm_parameter &params);
Napi::Object svmParametersToNapi(const Napi::Env &env, const svm_parameter &params);

Napi::Array nodeMatrixToNapi(Napi::Env env, svm_node **nodes, unsigned int nSamples, unsigned int nFeatures);
svm_node **napiToNodeMatrix(const Napi::Array &napiX);
svm_node *napiToNodeArray(const Napi::Array &napiX);

double **napiToDoubleMatrix(const Napi::Array &napiArray);
double *napiToDoubleArray(const Napi::Array &napiArray);
int *napiToInt32Array(const Napi::Array &napiArray);

template <typename T1>
Napi::Array matrixToNapi(Napi::Env env, T1 **matrix, unsigned int nLines, unsigned int nCol);

template <typename T2>
Napi::Array arrayToNapi(Napi::Env env, T2 *array, unsigned int array_size);

void freeSvmModel(struct svm_model *model);
void freeSvmModelOnly(struct svm_model *model);
void freeSvmProblem(struct svm_problem *prob, unsigned int nSamples);
void freeSvmParameters(struct svm_parameter *params);

int napiBoolOrNumberToInt(const Napi::Value &napi);