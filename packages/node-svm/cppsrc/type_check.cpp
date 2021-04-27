#include "type_check.h"

bool typeCheck::checkIfNumberMatrix(const Napi::Value &value)
{
    if (!value.IsArray())
    {
        return false;
    }

    Napi::Array matrix = value.As<Napi::Array>();
    uint32_t n_rows = matrix.Length();

    if (n_rows <= 0) // empty matrix
    {
        return true;
    }

    return checkIfNumberArray(matrix.Get((uint32_t)0));
}

bool typeCheck::checkIfNumberArray(const Napi::Value &value)
{
    if (!value.IsArray())
    {
        return false;
    }

    Napi::Array array = value.As<Napi::Array>();

    uint32_t n = array.Length();
    if (n <= 0) // empty array
    {
        return true;
    }

    return array.Get((uint32_t)0).IsNumber();
}

bool typeCheck::checkIfSvmParameters(const Napi::Value &value, struct typeCheck::TypeCheckResult &res)
{
    // int svm_type;
    // int kernel_type;
    // int degree;
    // double gamma;
    // double coef0;
    // double cache_size;
    // double eps;
    // double C;
    // int nr_weight;
    // int *weight_label;
    // double* weight;
    // double nu;
    // double p;
    // int shrinking;
    // int probability;

    if (!value.IsObject())
    {

        res.propertyName = "";
        return false;
    }

    Napi::Object object = value.As<Napi::Object>();
    if (!object.Get("svm_type").IsNumber())
    {
        res.propertyName = "svm_type";
        return false;
    }
    if (!object.Get("kernel_type").IsNumber())
    {
        res.propertyName = "kernel_type";
        return false;
    }
    if (!object.Get("degree").IsNumber())
    {
        res.propertyName = "degree";
        return false;
    }
    if (!object.Get("gamma").IsNumber())
    {
        res.propertyName = "gamma";
        return false;
    }
    if (!object.Get("coef0").IsNumber())
    {
        res.propertyName = "coef0";
        return false;
    }
    if (!object.Get("cache_size").IsNumber())
    {
        res.propertyName = "cache_size";
        return false;
    }
    if (!object.Get("eps").IsNumber())
    {
        res.propertyName = "eps";
        return false;
    }
    if (!object.Get("C").IsNumber())
    {
        res.propertyName = "C";
        return false;
    }
    if (!object.Get("nr_weight").IsNumber())
    {
        res.propertyName = "nr_weight";
        return false;
    }
    if (!object.Get("nu").IsNumber())
    {
        res.propertyName = "nu";
        return false;
    }
    if (!object.Get("p").IsNumber())
    {
        res.propertyName = "p";
        return false;
    }

    Napi::Value shrinking = object.Get("shrinking");
    if (!shrinking.IsNumber() && !shrinking.IsBoolean())
    {
        res.propertyName = "shrinking";
        return false;
    }

    Napi::Value probability = object.Get("probability");
    if (!probability.IsNumber() && !probability.IsBoolean())
    {
        res.propertyName = "probability";
        return false;
    }
    // if (!checkIfNumberArray(object.Get("weight_label")))
    // {
    //
    //     res.propertyName = "weight_label";
    //     return false;
    // }
    // if (!checkIfNumberArray(object.Get("weight")))
    // {
    //
    //     res.propertyName = "weight";
    //     return false;
    // }

    return true;
}

bool typeCheck::checkIfSvmModel(const Napi::Value &value, struct typeCheck::TypeCheckResult &res)
{
    // struct svm_parameter param;
    // int nr_class;
    // int l;
    // struct svm_node **SV;
    // double **sv_coef;
    // double *rho;
    // double *probA;
    // double *probB;
    // int *sv_indices;
    // int *label;
    // int *nSV;
    // int free_sv;

    if (!value.IsObject())
    {
        res.propertyName = "";
        return false;
    }

    Napi::Object object = value.As<Napi::Object>();
    if (!object.HasOwnProperty("param"))
    {
        res.propertyName = "param";
        return false;
    }
    if (!checkIfSvmParameters(object.Get("param"), res))
    {
        return false;
    }
    if (!object.Get("nr_class").IsNumber())
    {
        res.propertyName = "nr_class";
        return false;
    }
    if (!object.Get("l").IsNumber())
    {
        res.propertyName = "l";
        return false;
    }
    if (!checkIfNumberMatrix(object.Get("SV")))
    {
        res.propertyName = "SV";
        return false;
    }
    if (!checkIfNumberMatrix(object.Get("sv_coef")))
    {
        res.propertyName = "sv_coef";
        return false;
    }
    if (!checkIfNumberArray(object.Get("rho")))
    {
        res.propertyName = "rho";
        return false;
    }
    if (!checkIfNumberArray(object.Get("probA")))
    {
        res.propertyName = "probA";
        return false;
    }
    if (!checkIfNumberArray(object.Get("probB")))
    {
        res.propertyName = "probB";
        return false;
    }
    if (!checkIfNumberArray(object.Get("sv_indices")))
    {
        res.propertyName = "sv_indices";
        return false;
    }
    if (!checkIfNumberArray(object.Get("label")))
    {
        res.propertyName = "label";
        return false;
    }
    if (!checkIfNumberArray(object.Get("nSV")))
    {
        res.propertyName = "nSV";
        return false;
    }
    if (!object.Get("free_sv").IsNumber())
    {
        res.propertyName = "free_sv";
        return false;
    }

    return true;
}