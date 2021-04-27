#include <iostream>
#include "trainer_class.h"

Napi::FunctionReference TrainerClass::constructor;

Napi::Object TrainerClass::Init(Napi::Env env, Napi::Object exports)
{
  Napi::HandleScope scope(env);
  Napi::Function func = DefineClass(env, "TrainerClass",
                                    {InstanceMethod("init", &TrainerClass::InitTrainer),
                                     InstanceMethod("get_params", &TrainerClass::GetParams),
                                     InstanceMethod("set_params", &TrainerClass::SetParams),
                                     InstanceMethod("append", &TrainerClass::Append),
                                     InstanceMethod("train", &TrainerClass::Train),
                                     InstanceMethod("train_async", &TrainerClass::TrainAsync)});

  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();

  exports.Set("Trainer", func);
  return exports;
}

TrainerClass::TrainerClass(const Napi::CallbackInfo &info)
    : Napi::ObjectWrap<TrainerClass>(info)
{
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  bool debug = false;
  if (info.Length() == 1)
  {
    Napi::Object options = info[0].As<Napi::Object>();
    if (options.Has("debug"))
    {
      debug = options.Get("debug").ToBoolean().Value();
    }
  }

  this->trainer = new NodeTrainer(debug);
  this->trainer->select("lbfgs", "crf1d");
}

Napi::Value TrainerClass::InitTrainer(const Napi::CallbackInfo &info)
{
  return Napi::Boolean::New(info.Env(), true);
}

Napi::Value TrainerClass::GetParams(const Napi::CallbackInfo &info)
{
  CRFSuite::StringList params = this->trainer->params();

  // Create a new empty object.
  Napi::Object obj = Napi::Object::New(info.Env());

  for (size_t i = 0; i < params.size(); i++)
  {
    obj.Set(params[i], this->trainer->get(params[i]));
  }

  return obj;
}

void TrainerClass::SetParams(const Napi::CallbackInfo &info)
{
  if (info.Length() == 0 || !info[0].IsObject())
  {
    Napi::TypeError::New(info.Env(), "Options argument is missing or invalid").ThrowAsJavaScriptException();
  }

  Napi::Object params = info[0].As<Napi::Object>();
  Napi::Array property_names = params.GetPropertyNames();

  for (size_t i = 0; i < property_names.Length(); ++i)
  {
    Napi::Value key = property_names.Get(i);
    Napi::Value value = params.Get(key);

    if (key.IsString())
    {
      this->trainer->set(key.As<Napi::String>().Utf8Value(), value.ToString().Utf8Value());
    }
    else
    {
      Napi::TypeError::New(info.Env(), "Invalid parameter name").ThrowAsJavaScriptException();
    }
  }
}

void TrainerClass::Append(const Napi::CallbackInfo &info)
{
  if (info.Length() < 2)
  {
    Napi::TypeError::New(info.Env(), "Invalid number of arguments").ThrowAsJavaScriptException();
  }

  if (!info[0].IsArray())
  {
    Napi::TypeError::New(info.Env(), "xseq (training data) argument must be an array of arrays").ThrowAsJavaScriptException();
  }

  if (!info[1].IsArray())
  {
    Napi::TypeError::New(info.Env(), "yseq (labels) argument must be an array").ThrowAsJavaScriptException();
  }

  Napi::Array xseq = info[0].As<Napi::Array>(); // Local<Array>::Cast(args[0]);
  Napi::Array yseq = info[1].As<Napi::Array>(); // Local<Array>::Cast(args[1]);

  if (xseq.Length() != yseq.Length())
  {
    Napi::TypeError::New(info.Env(), "xseq and yseq must be of same size").ThrowAsJavaScriptException();
  }

  CRFSuite::ItemSequence items;
  CRFSuite::StringList labels;

  for (size_t i = 0; i < xseq.Length(); ++i)
  {
    Napi::Value val = xseq.Get(i);
    if (!val.IsArray())
    {
      Napi::TypeError::New(info.Env(), "xseq (training data) argument must be an array of arrays").ThrowAsJavaScriptException();
    }

    Napi::Array xxseq = val.As<Napi::Array>();

    CRFSuite::Item item;
    item.empty();

    for (size_t j = 0; j < xxseq.Length(); ++j)
    {
      Napi::String attrName = xxseq.Get(j).ToString();

      std::string key(attrName.Utf8Value());
      size_t pos = key.find(':');
      if (pos != std::string::npos)
      {
        // weight provided
        double weight = atof(key.substr(pos + 1).c_str());
        std::string name = key.substr(0, pos);
        // std::cout << "Weight of " << name << " is " << weight << " and pos " << pos << std::endl;
        item.push_back(CRFSuite::Attribute(name, weight));
      }
      else
      {
        // no weight
        // std::cout << "NONE FOR  " << key << " pos is " << pos << std::endl;
        item.push_back(CRFSuite::Attribute(key));
      }
    }
    items.push_back(item);
  }

  for (size_t i = 0; i < yseq.Length(); ++i)
  {
    Napi::String attrName = yseq.Get(i).ToString();
    labels.push_back(attrName.Utf8Value());
  }

  try
  {
    this->trainer->append(items, labels, 0);
  }
  catch (std::invalid_argument &e)
  {
    Napi::TypeError::New(info.Env(), "Invalid arguments").ThrowAsJavaScriptException();
  }
  catch (std::runtime_error &e)
  {
    Napi::TypeError::New(info.Env(), "Out of memory").ThrowAsJavaScriptException();
  }
}

Napi::Value TrainerClass::Train(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsString())
  {
    Napi::TypeError::New(env, "Path to model file is missing or invalid").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (info.Length() > 1 && info[1].IsFunction())
  {
    Napi::Function fn = info[1].As<Napi::Function>();
    auto trainerInstance = this->trainer;
    std::function<void(const int32_t iteration)> progressCb = [fn, env, trainerInstance](const int32_t iteration) {
      Napi::Number napiIt = Napi::Number::New(env, iteration);
      Napi::Value res = fn.Call({napiIt});
      if (res.IsNumber())
      {
        int32_t statusCode = res.As<Napi::Number>().Uint32Value();
        if (statusCode)
        {
          trainerInstance->cancelTraining();
        }
      }
    };
    trainer->progress_callback = progressCb;
  }

  Napi::String path = info[0].As<Napi::String>();

  int32_t status = this->trainer->train(path.Utf8Value(), -1);
  return Napi::Number::New(env, status);
}

Napi::Value EmptyCallbackFunction(const Napi::CallbackInfo &info)
{
  return Napi::Number::New(info.Env(), 0);
}

Napi::Value TrainerClass::TrainAsync(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsString())
  {
    Napi::TypeError::New(env, "Arguments should the path to file model as a string").ThrowAsJavaScriptException();
    return env.Null();
  }
  Napi::String path = info[0].As<Napi::String>();

  Napi::Function progress_callback;
  if (info.Length() > 1 && info[1].IsFunction())
  {
    progress_callback = info[1].As<Napi::Function>();
  }
  else
  {
    progress_callback = Napi::Function::New<EmptyCallbackFunction>(env);
  }

  Napi::Promise::Deferred deferred = Napi::Promise::Deferred::New(env);

  TrainingWorker *worker = new TrainingWorker(this->trainer, path.Utf8Value(), deferred, progress_callback);
  worker->Queue();

  return worker->deferred_.Promise();
}
