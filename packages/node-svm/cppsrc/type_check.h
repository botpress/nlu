#include <napi.h>
#include <vector>
#include <string>

namespace typeCheck
{
    bool checkIfNumberMatrix(const Napi::Value &value);
    bool checkIfNumberArray(const Napi::Value &value);
    bool checkIfSvmParameters(const Napi::Value &value, struct TypeCheckResult &res);
    bool checkIfSvmModel(const Napi::Value &value, struct TypeCheckResult &res);

    struct TypeCheckResult
    {
        std::string propertyName;
    };
} // namespace typeCheck