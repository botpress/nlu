#include "nsvm.h"

Napi::FunctionReference NSVM::constructor;

NSVM::NSVM(const Napi::CallbackInfo &info) : Napi::ObjectWrap<NSVM>(info)
{
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  this->_state = new NsvmState();
  this->_state->modelIsTrained = false;
  this->_state->isSeeded = false;

  if (info.Length() > 0 && info[0].IsObject())
  {
    Napi::Object args = info[0].As<Napi::Object>();
    if (args.Get("random_seed").IsNumber())
    {
      Napi::Number randomSeed = args.Get("random_seed").As<Napi::Number>();
      this->_state->isSeeded = true;
      this->_state->randomSeed = randomSeed.Int32Value();
    }
  }
}

NSVM::~NSVM()
{
  // std::cout << "destructor called! :)" << std::endl;
  if (this->_state->modelIsTrained)
  {
    free();
  }
  delete this->_state;
}

Napi::Value NSVM::svmTrain(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  if (info.Length() != 3)
  {
    Napi::TypeError::New(env, "train expects 3 arguments: train params, X and y").ThrowAsJavaScriptException();
    return env.Null();
  }

  struct typeCheck::TypeCheckResult res = {"none"};
  bool isParam = typeCheck::checkIfSvmParameters(info[0], res);
  if (!isParam)
  {
    std::stringstream ss;
    ss << "SVM training parameters format is not OK. Property '" << res.propertyName << "' is missing.";
    Napi::TypeError::New(env, ss.str()).ThrowAsJavaScriptException();
    return env.Null();
  }

  bool isX = typeCheck::checkIfNumberMatrix(info[1]);
  if (!isX)
  {
    Napi::TypeError::New(env, "SVM training samples should be a number matrix (number[][])").ThrowAsJavaScriptException();
    return env.Null();
  }

  bool isY = typeCheck::checkIfNumberArray(info[2]);
  if (!isY)
  {
    Napi::TypeError::New(env, "SVM training labels should be a number array (number[])").ThrowAsJavaScriptException();
    return env.Null();
  }

  Napi::Object napiParams = info[0].As<Napi::Object>();
  Napi::Array napiX = info[1].As<Napi::Array>();
  Napi::Array napiY = info[2].As<Napi::Array>();

  unsigned int nSamples = napiY.Length();
  unsigned int nFeatures = napiX.Get((uint32_t)0).As<Napi::Array>().Length();
  this->_state->nFeatures = nFeatures;
  this->_state->nSamples = nSamples;

  this->_state->problem = new svm_problem();
  this->_state->problem->l = nSamples;
  this->_state->problem->x = napiToNodeMatrix(napiX);
  this->_state->problem->y = napiToDoubleArray(napiY);

  struct svm_parameter params = {0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, 0, 0, 0, 0};
  napiToSvmParameters(napiParams, params);

  this->_state->mute = napiParams.Get("mute").As<Napi::Boolean>().ToBoolean();

  struct train::TrainingResult results = {""};
  if (!train::train(params, this->_state, results))
  {
    Napi::TypeError::New(env, results.error_reason).ThrowAsJavaScriptException();
    return env.Null();
  }

  return env.Null();
}

Napi::Value NSVM::svmTrainAsync(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  if (info.Length() != 4)
  {
    Napi::TypeError::New(env, "train_async expects at 4 arguments: train params, X, y adn the callback function").ThrowAsJavaScriptException();
    return env.Null();
  }

  struct typeCheck::TypeCheckResult res = {"none"};
  bool isParam = typeCheck::checkIfSvmParameters(info[0], res);
  if (!isParam)
  {
    std::stringstream ss;
    ss << "SVM training parameters format is not OK. Property '" << res.propertyName << "' is missing.";
    Napi::TypeError::New(env, ss.str()).ThrowAsJavaScriptException();
    return env.Null();
  }

  bool isX = typeCheck::checkIfNumberMatrix(info[1]);
  if (!isX)
  {
    Napi::TypeError::New(env, "SVM training samples should be a number matrix (number[][])").ThrowAsJavaScriptException();
    return env.Null();
  }

  bool isY = typeCheck::checkIfNumberArray(info[2]);
  if (!isY)
  {
    Napi::TypeError::New(env, "SVM training labels should be a number array (number[])").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (!info[3].IsFunction())
  {
    Napi::TypeError::New(env, "callback should be a function to call when training is done.").ThrowAsJavaScriptException();
    return env.Null();
  }

  Napi::Object napiParams = info[0].As<Napi::Object>();
  Napi::Array napiX = info[1].As<Napi::Array>();
  Napi::Array napiY = info[2].As<Napi::Array>();
  Napi::Function cb = info[3].As<Napi::Function>();

  unsigned int nSamples = napiY.Length();
  unsigned int nFeatures = napiX.Get((uint32_t)0).As<Napi::Array>().Length();
  this->_state->nFeatures = nFeatures;
  this->_state->nSamples = nSamples;

  this->_state->problem = new svm_problem();
  this->_state->problem->l = nSamples;
  this->_state->problem->x = napiToNodeMatrix(napiX);
  this->_state->problem->y = napiToDoubleArray(napiY);

  struct svm_parameter params = {0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, 0, 0, 0, 0};
  napiToSvmParameters(napiParams, params);

  this->_state->mute = napiParams.Get("mute").As<Napi::Boolean>().ToBoolean();

  TrainingWorker *worker = new TrainingWorker(params, this->_state, cb);
  worker->Queue();

  return env.Null();
}

Napi::Value NSVM::svmPredict(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  if (!this->_state->modelIsTrained)
  {
    Napi::TypeError::New(env, "model was already freed from memory, instanciate a new NSVM").ThrowAsJavaScriptException();
    return env.Null();
  }

  bool isX = typeCheck::checkIfNumberArray(info[0]);
  if (!isX)
  {
    Napi::TypeError::New(env, "Array of length = nFeatures expected").ThrowAsJavaScriptException();
    return env.Null();
  }

  Napi::Array napiX = info[0].As<Napi::Array>();
  svm_node *x = napiToNodeArray(napiX);

  double prediction = svm_predict(this->_state->model, x);

  delete[] x;

  return Napi::Number::New(env, prediction);
}

Napi::Value NSVM::svmPredictAsync(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  if (!this->_state->modelIsTrained)
  {
    Napi::TypeError::New(env, "model was already freed from memory, instanciate a new NSVM").ThrowAsJavaScriptException();
    return env.Null();
  }

  bool isX = typeCheck::checkIfNumberArray(info[0]);
  if (!isX)
  {
    Napi::TypeError::New(env, "Array of length = nFeatures expected").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (!info[1].IsFunction())
  {
    Napi::TypeError::New(env, "callback should be a function to call when training is done.").ThrowAsJavaScriptException();
    return env.Null();
  }

  Napi::Array napiX = info[0].As<Napi::Array>();
  Napi::Function cb = info[1].As<Napi::Function>();

  svm_node *x = napiToNodeArray(napiX);

  PredictWorker *worker = new PredictWorker(x, this->_state->model, cb);

  worker->Queue();

  return env.Null();
}

Napi::Value NSVM::svmPredictProbability(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  if (!this->_state->modelIsTrained)
  {
    Napi::TypeError::New(env, "model was already freed from memory, instanciate a new NSVM").ThrowAsJavaScriptException();
    return env.Null();
  }

  bool isX = typeCheck::checkIfNumberArray(info[0]);
  if (!isX)
  {
    Napi::TypeError::New(env, "Array of length = nFeatures expected").ThrowAsJavaScriptException();
    return env.Null();
  }

  Napi::Array napiX = info[0].As<Napi::Array>();

  svm_node *x = napiToNodeArray(napiX);

  double *probs = new double[this->_state->model->nr_class];
  double prediction = svm_predict_probability(this->_state->model, x, probs);

  Napi::Object ret = Napi::Object::New(env);
  ret.Set("prediction", prediction);
  ret.Set("probabilities", arrayToNapi(env, probs, this->_state->model->nr_class));

  delete[] probs;
  delete[] x;

  return ret;
}

Napi::Value NSVM::svmPredictProbabilityAsync(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  if (!this->_state->modelIsTrained)
  {
    Napi::TypeError::New(env, "model was already freed from memory, instanciate a new NSVM").ThrowAsJavaScriptException();
    return env.Null();
  }

  bool isX = typeCheck::checkIfNumberArray(info[0]);
  if (!isX)
  {
    Napi::TypeError::New(env, "Array of length = nFeatures expected").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (!info[1].IsFunction())
  {
    Napi::TypeError::New(env, "callback should be a function to call when training is done.").ThrowAsJavaScriptException();
    return env.Null();
  }

  Napi::Array napiX = info[0].As<Napi::Array>();
  Napi::Function cb = info[1].As<Napi::Function>();

  svm_node *x = napiToNodeArray(napiX);

  PredictProbWorker *worker = new PredictProbWorker(x, this->_state->model, cb);

  worker->Queue();

  return env.Null();
}

Napi::Value NSVM::setModel(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  if (info.Length() != 1)
  {
    Napi::TypeError::New(env, "set model expects 1 argument: the model").ThrowAsJavaScriptException();
    return env.Null();
  }

  struct typeCheck::TypeCheckResult res = {"none"};
  bool isModel = typeCheck::checkIfSvmModel(info[0], res);
  if (!isModel)
  {
    std::stringstream ss;
    ss << "SVM model format is not OK. Property '" << res.propertyName << "' is either missing or incorrect.";
    Napi::TypeError::New(env, ss.str()).ThrowAsJavaScriptException();
    return env.Null();
  }

  if (this->_state->modelIsTrained)
  {
    free();
  }

  Napi::Object napiModel = info[0].As<Napi::Object>();

  Napi::Array napiSVs = napiModel.Get("SV").As<Napi::Array>();
  unsigned int nSamples = napiSVs.Length();
  unsigned int nFeatures = napiSVs.Get((uint32_t)0).As<Napi::Array>().Length();

  this->_state->model = new svm_model();
  napiToSvmModel(napiModel, *(this->_state->model));

  this->_state->model->free_sv = 1; // important
  this->_state->modelIsTrained = true;
  this->_state->nFeatures = nFeatures;
  this->_state->nSamples = nSamples;

  return env.Null();
}

Napi::Value NSVM::getModel(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  if (!this->_state->modelIsTrained)
  {
    Napi::TypeError::New(env, "model was already freed from memory...").ThrowAsJavaScriptException();
    return env.Null();
  }

  return svmModelToNapi(env, *(this->_state->model), this->_state->nSamples, this->_state->nFeatures);
}

Napi::Value NSVM::freeModel(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  if (!this->_state->modelIsTrained)
  {
    Napi::TypeError::New(env, "model was already freed from memory...").ThrowAsJavaScriptException();
    return env.Null();
  }

  free();
  return env.Null();
}

void NSVM::free()
{
  if (this->_state->model->free_sv)
  {
    freeSvmModel(this->_state->model);
  }
  else
  {
    freeSvmProblem(this->_state->problem, this->_state->problem->l);
    freeSvmModelOnly(this->_state->model);
  }
  this->_state->modelIsTrained = false;
}

Napi::Value NSVM::isTrained(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  Napi::Boolean isTrained = Napi::Boolean::New(env, this->_state->modelIsTrained);
  return isTrained;
}

void NSVM::Init(Napi::Env env, Napi::Object exports)
{
  Napi::HandleScope scope(env);

  Napi::Function func = DefineClass(env, "NSVM", {InstanceMethod("train", &NSVM::svmTrain),

                                                  InstanceMethod("train_async", &NSVM::svmTrainAsync),

                                                  InstanceMethod("predict", &NSVM::svmPredict),

                                                  InstanceMethod("predict_async", &NSVM::svmPredictAsync),

                                                  InstanceMethod("predict_probability", &NSVM::svmPredictProbability),

                                                  InstanceMethod("predict_probability_async", &NSVM::svmPredictProbabilityAsync),

                                                  InstanceMethod("free_model", &NSVM::freeModel),

                                                  InstanceMethod("get_model", &NSVM::getModel),

                                                  InstanceMethod("set_model", &NSVM::setModel),

                                                  InstanceMethod("is_trained", &NSVM::isTrained)});

  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();

  exports.Set("NSVM", func);
}
