#include "utils.h"

void napiToSvmModel(const Napi::Object &napiModel, svm_model &model)
{
    napiToSvmParameters(napiModel.Get("param").As<Napi::Object>(), model.param);
    model.nr_class = napiModel.Get("nr_class").As<Napi::Number>().Int32Value();
    model.l = napiModel.Get("l").As<Napi::Number>().Int32Value();
    model.SV = napiToNodeMatrix(napiModel.Get("SV").As<Napi::Array>());
    model.sv_coef = napiToDoubleMatrix(napiModel.Get("sv_coef").As<Napi::Array>());
    model.rho = napiToDoubleArray(napiModel.Get("rho").As<Napi::Array>());
    model.probA = napiToDoubleArray(napiModel.Get("probA").As<Napi::Array>());
    model.probB = napiToDoubleArray(napiModel.Get("probB").As<Napi::Array>());
    model.sv_indices = napiToInt32Array(napiModel.Get("sv_indices").As<Napi::Array>());
    model.label = napiToInt32Array(napiModel.Get("label").As<Napi::Array>());
    model.nSV = napiToInt32Array(napiModel.Get("nSV").As<Napi::Array>());
    model.free_sv = napiModel.Get("free_sv").As<Napi::Number>().Int32Value();
}

Napi::Object svmModelToNapi(const Napi::Env &env, const svm_model &model, unsigned int nSamples, unsigned int nFeatures)
{
    unsigned int k = model.nr_class;
    unsigned int pairwaise_combinations = k * (k - 1) / 2;

    unsigned int nSupports = model.l;

    Napi::Object napiModel = Napi::Object::New(env);
    napiModel.Set("param", svmParametersToNapi(env, model.param));
    napiModel.Set("nr_class", model.nr_class);
    napiModel.Set("l", nSupports);
    napiModel.Set("SV", nodeMatrixToNapi(env, model.SV, nSupports, nFeatures));
    napiModel.Set("sv_coef", matrixToNapi(env, model.sv_coef, k - 1, nSupports));
    napiModel.Set("rho", arrayToNapi(env, model.rho, pairwaise_combinations));
    napiModel.Set("probA", arrayToNapi(env, model.probA, pairwaise_combinations));
    napiModel.Set("probB", arrayToNapi(env, model.probB, pairwaise_combinations));
    napiModel.Set("sv_indices", arrayToNapi(env, model.sv_indices, nSupports));
    napiModel.Set("label", arrayToNapi(env, model.label, k));
    napiModel.Set("nSV", arrayToNapi(env, model.nSV, k));
    napiModel.Set("free_sv", model.free_sv);
    return napiModel;
}

void napiToSvmParameters(const Napi::Object &napiParams, svm_parameter &params)
{
    params.svm_type = napiParams.Get("svm_type").As<Napi::Number>().Int32Value();
    params.kernel_type = napiParams.Get("kernel_type").As<Napi::Number>().Int32Value();
    params.degree = napiParams.Get("degree").As<Napi::Number>().Int32Value();
    params.gamma = napiParams.Get("gamma").As<Napi::Number>().DoubleValue();
    params.coef0 = napiParams.Get("coef0").As<Napi::Number>().DoubleValue();
    params.cache_size = napiParams.Get("cache_size").As<Napi::Number>().DoubleValue();
    params.eps = napiParams.Get("eps").As<Napi::Number>().DoubleValue();
    params.C = napiParams.Get("C").As<Napi::Number>().DoubleValue();
    params.nr_weight = napiParams.Get("nr_weight").As<Napi::Number>().Int32Value();
    params.nu = napiParams.Get("nu").As<Napi::Number>().DoubleValue();
    params.p = napiParams.Get("p").As<Napi::Number>().DoubleValue();
    params.shrinking = napiBoolOrNumberToInt(napiParams.Get("shrinking"));
    params.probability = napiBoolOrNumberToInt(napiParams.Get("probability"));
    params.weight_label = napiToInt32Array(napiParams.Get("weight_label").As<Napi::Array>());
    params.weight = napiToDoubleArray(napiParams.Get("weight").As<Napi::Array>());
}

int napiBoolOrNumberToInt(const Napi::Value &napi)
{
    if (napi.IsBoolean())
    {
        bool value = napi.As<Napi::Boolean>().ToBoolean();
        return (int)(value ? 1 : 0);
    }
    return napi.As<Napi::Number>().Int32Value();
}

Napi::Object svmParametersToNapi(const Napi::Env &env, const svm_parameter &params)
{

    Napi::Object napiParams = Napi::Object::New(env);

    napiParams.Set("svm_type", params.svm_type);
    napiParams.Set("kernel_type", params.kernel_type);
    napiParams.Set("degree", params.degree);
    napiParams.Set("gamma", params.gamma);
    napiParams.Set("coef0", params.coef0);
    napiParams.Set("cache_size", params.cache_size);
    napiParams.Set("eps", params.eps);
    napiParams.Set("C", params.C);
    napiParams.Set("nr_weight", params.nr_weight);
    napiParams.Set("nu", params.nu);
    napiParams.Set("p", params.p);
    napiParams.Set("shrinking", params.shrinking);
    napiParams.Set("probability", params.probability);
    napiParams.Set("weight_label", arrayToNapi(env, params.weight_label, params.nr_weight));
    napiParams.Set("weight", arrayToNapi(env, params.weight, params.nr_weight));

    return napiParams;
}

svm_node **napiToNodeMatrix(const Napi::Array &napiX)
{

    unsigned int nSamples = napiX.Length();

    svm_node **x = new svm_node *[nSamples];

    for (unsigned int s = 0; s < nSamples; s++)
    {
        Napi::Array sample = napiX.Get(s).As<Napi::Array>();
        x[s] = napiToNodeArray(sample);
    }

    return x;
}

svm_node *napiToNodeArray(const Napi::Array &napiSample)
{
    unsigned int nFeatures = napiSample.Length();

    svm_node *sample = new svm_node[nFeatures + 1];

    for (unsigned int f = 0; f < nFeatures; f++)
    {
        sample[f].index = f + 1;
        sample[f].value = napiSample.Get(f).As<Napi::Number>().DoubleValue();
    }
    sample[nFeatures].index = -1; // important
    return sample;
}

Napi::Array nodeMatrixToNapi(Napi::Env env, svm_node **nodes, unsigned int nSamples, unsigned int nFeatures)
{

    Napi::Array napiMatrix = Napi::Array::New(env);

    for (unsigned int s = 0; s < nSamples; s++)
    {
        Napi::Array sample = Napi::Array::New(env);

        for (unsigned int f = 0; f < nFeatures; f++)
        {
            sample.Set(f, Napi::Number::New(env, nodes[s][f].value));
        }
        napiMatrix.Set(s, sample);
    }

    return napiMatrix;
}

double **napiToDoubleMatrix(const Napi::Array &napiArray)
{
    unsigned int nLines = napiArray.Length();
    double **heapArray = new double *[nLines];
    for (unsigned int i = 0; i < nLines; i++)
    {
        heapArray[i] = napiToDoubleArray(napiArray.Get(i).As<Napi::Array>());
    }
    return heapArray;
}

double *napiToDoubleArray(const Napi::Array &napiArray)
{
    unsigned int size = napiArray.Length();
    double *heapArray = new double[size];
    for (unsigned int i = 0; i < size; i++)
    {
        heapArray[i] = napiArray.Get(i).As<Napi::Number>().DoubleValue();
    }
    return heapArray;
}

int *napiToInt32Array(const Napi::Array &napiArray)
{
    unsigned int size = napiArray.Length();
    int *heapArray = new int[size];
    for (unsigned int i = 0; i < size; i++)
    {
        heapArray[i] = napiArray.Get(i).As<Napi::Number>().Int32Value();
    }
    return heapArray;
}

template <typename T1>
Napi::Array matrixToNapi(Napi::Env env, T1 **matrix, unsigned int nLines, unsigned int nCol)
{
    Napi::Array napiMatrix = Napi::Array::New(env);

    if (matrix == NULL)
    {
        return napiMatrix;
    }

    for (unsigned int i = 0; i < nLines; i++)
    {
        Napi::Array currentLine = arrayToNapi(env, matrix[i], nCol);
        napiMatrix.Set(i, currentLine);
    }

    return napiMatrix;
}

template <typename T2>
Napi::Array arrayToNapi(Napi::Env env, T2 *array, unsigned int array_size)
{
    Napi::Array napiArray = Napi::Array::New(env);

    if (array == NULL)
    {
        return napiArray;
    }

    for (unsigned int i = 0; i < array_size; i++)
    {
        napiArray.Set(i, array[i]);
    }

    return napiArray;
}

void freeSvmModel(struct svm_model *model)
{
    for (int i = 0; i < model->l; i++)
    {
        delete[] model->SV[i];
    }
    delete[] model->SV;

    freeSvmModelOnly(model);
}

void freeSvmModelOnly(struct svm_model *model)
{
    freeSvmParameters(&(model->param));

    delete[] model->label;
    delete[] model->nSV;
    delete[] model->probA;
    delete[] model->probB;
    delete[] model->rho;

    for (int i = 0; i < (model->nr_class - 1); i++)
    {
        delete[] model->sv_coef[i];
    }
    delete[] model->sv_coef;

    delete[] model->sv_indices;
}

void freeSvmProblem(struct svm_problem *prob, unsigned int nSamples)
{
    delete[](prob->y);
    for (unsigned int i = 0; i < nSamples; i++)
    {
        delete[](prob->x[i]);
    }
    delete[](prob->x);
}

void freeSvmParameters(struct svm_parameter *params)
{
    delete[] params->weight_label;
    delete[] params->weight;
}