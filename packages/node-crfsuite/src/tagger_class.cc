#include "tagger_class.h"

Napi::FunctionReference TaggerClass::constructor;

TaggerClass::TaggerClass(const Napi::CallbackInfo &info)
    : Napi::ObjectWrap<TaggerClass>(info)
{
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);
  tagger = new CRFSuite::Tagger();
}

Napi::Object TaggerClass::Init(Napi::Env env, Napi::Object exports)
{
  Napi::HandleScope scope(env);
  Napi::Function func = DefineClass(env, "TaggerClass",
                                    {InstanceMethod("open", &TaggerClass::Open),
                                     InstanceMethod("close", &TaggerClass::Close),
                                     InstanceMethod("tag", &TaggerClass::Tag),
                                     InstanceMethod("get_labels", &TaggerClass::GetLabels),
                                     InstanceMethod("marginal", &TaggerClass::Marginal)

                                    });

  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();

  exports.Set("Tagger", func);
  return exports;
}

Napi::Value TaggerClass::Open(const Napi::CallbackInfo &info)
{
  if (info.Length() < 1 || !info[0].IsString())
  {
    Napi::TypeError::New(info.Env(), "Path to model file is missing or invalid").ThrowAsJavaScriptException();
  }

  Napi::String path = info[0].As<Napi::String>();
  return Napi::Boolean::New(info.Env(), this->tagger->open(path.Utf8Value()));
}

Napi::Value TaggerClass::Close(const Napi::CallbackInfo &info)
{
  this->tagger->close();
  return Napi::Boolean::New(info.Env(), true);
}

CRFSuite::ItemSequence TaggerClass::GetItems(const Napi::CallbackInfo &info, struct Error & err)
{
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  CRFSuite::ItemSequence items;

  if (info.Length() < 1)
  {
    err.msg = "xseq is missing";
    return items;
  }
  else if (!info[0].IsArray())
  {
    err.msg = "xseq must be an array of arrays";
    return items;
  }

  Napi::Array xseq = info[0].As<Napi::Array>();

  for (size_t i = 0; i < xseq.Length(); ++i)
  {
    Napi::Value val = xseq.Get(i);
    if (!val.IsArray())
    {
      err.msg = "xseq must be an array of arrays";
      return items;
    }

    Napi::Array xxseq = val.As<Napi::Array>();

    CRFSuite::Item item;
    item.empty();

    for (size_t j = 0; j < xxseq.Length(); ++j)
    {
      Napi::String observable = xxseq.Get(j).ToString();

      std::string key(observable.Utf8Value());
      size_t pos = key.find(':');
      if (pos != std::string::npos)
      {
        // weight provided
        double weight = atof(key.substr(pos + 1).c_str());
        std::string name = key.substr(0, pos);
        // std::cout << "Weight of " << name << " is " << weight << " index is " << pos << std::endl;
        item.push_back(CRFSuite::Attribute(name, weight));
      }
      else
      {
        // no weight
        item.push_back(CRFSuite::Attribute(key));
      }
    }
    items.push_back(item);
  }

  return items;
}

Napi::Value TaggerClass::Tag(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  struct Error err = {""};
  CRFSuite::ItemSequence items = GetItems(info, err);
  if (err.msg != "") {
    Napi::TypeError::New(env, err.msg).ThrowAsJavaScriptException();
    return env.Null();
  }

  CRFSuite::StringList labels = this->tagger->tag(items);
  double probability = this->tagger->probability(labels);

  // Create a new empty array.
  Napi::Array array = Napi::Array::New(env);
  for (size_t i = 0; i < labels.size(); i++)
  {
    Napi::String value = Napi::String::New(env, labels[i].c_str());
    array.Set(i, value);
  }
  // output tuple
  Napi::Object ret = Napi::Object::New(env);
  ret.Set("probability", Napi::Number::New(env, probability));
  ret.Set("result", array);

  return ret;
}

Napi::Value TaggerClass::GetLabels(const Napi::CallbackInfo &info)
{
  CRFSuite::StringList list = this->tagger->labels();

  // Create a new empty array.
  Napi::Array result = Napi::Array::New(info.Env(), list.size());

  for (size_t i = 0; i < list.size(); i++)
  {
    Napi::String value = Napi::String::New(info.Env(), list[i]);
    result.Set(i, value);
  }

  return result;
}

Napi::Value TaggerClass::Marginal(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  struct Error err = {""};
  CRFSuite::ItemSequence items = this->GetItems(info, err);
  if (err.msg != "") {
    Napi::TypeError::New(env, err.msg).ThrowAsJavaScriptException();
    return env.Null();
  }

  this->tagger->set(items);
  CRFSuite::StringList labels = this->tagger->labels();
  Napi::Array array = Napi::Array::New(env);

  for (size_t w = 0; w < items.size(); w++)
  {
    Napi::Object probs = Napi::Object::New(env);
    for (size_t i = 0; i < labels.size(); i++)
    {
      double probability = this->tagger->marginal(labels[i], w);
      probs.Set(labels[i].c_str(), Napi::Number::New(env, probability));
    }
    array.Set(w, probs);
  }

  return array;
}
