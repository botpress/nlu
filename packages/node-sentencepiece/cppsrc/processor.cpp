#include "processor.h"

Napi::FunctionReference Processor::constructor;

void Processor::Init(Napi::Env env, Napi::Object exports) {
  Napi::HandleScope scope(env);

  Napi::Function func = DefineClass(env, "Processor", {
    InstanceMethod("encode", &Processor::encode),
    InstanceMethod("decode", &Processor::decode),
    InstanceMethod("loadModel", &Processor::loadModel)
  });

  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();

  exports.Set("Processor", func);
}

Processor::Processor(const Napi::CallbackInfo& info) : Napi::ObjectWrap<Processor>(info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  this->actualProcessor = new sentencepiece::SentencePieceProcessor();
}

void Processor::loadModel(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  int length = info.Length();
  if (length != 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "String expected for model path").ThrowAsJavaScriptException();
  }

  Napi::String modelPath = info[0].As<Napi::String>();

  const auto status = this->actualProcessor->Load(modelPath.Utf8Value());

  if (!status.ok()) {
    std::string errorMessage = std::string("Model for tokenization could not be loaded : ").append(modelPath.Utf8Value());
    Napi::TypeError::New(env, errorMessage).ThrowAsJavaScriptException();
  }
}

Napi::Value Processor::encode(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  if (info.Length() != 1 || !info[0].IsString()) {
      const char * errorMessage = "Incorrect parameters. Function expects one string params input text";
      Napi::TypeError::New(env, errorMessage).ThrowAsJavaScriptException();
  }

  Napi::String inputString = info[0].As<Napi::String>();

  std::vector<std::string> pieces;
  this->actualProcessor->Encode(inputString.Utf8Value(), &pieces);

  Napi::Array napiPieces = Napi::Array::New(env);
  for (unsigned int i = 0; i < pieces.size(); i++) {
      napiPieces.Set(i, Napi::String::New(env, pieces[i].c_str()));
  }
  return napiPieces;
}

Napi::Value Processor::decode(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  if (info.Length() != 1 || !info[0].IsArray()) {
      const char * errorMessage = "Incorrect parameters. Function expects one array param for pieces to decode";
      Napi::TypeError::New(env, errorMessage).ThrowAsJavaScriptException();
  }

  Napi::Array pieces = info[0].As<Napi::Array>();

  std::vector<std::string> vectorPieces = std::vector<std::string>();
  for (unsigned int i = 0; i < pieces.Length(); i++) {
      std::string stringPiece = pieces.Get(i).As<Napi::String>().Utf8Value();
      vectorPieces.push_back(stringPiece);
  }

  std::string reconstructedText;
  this->actualProcessor->Decode(vectorPieces, &reconstructedText);

  return Napi::String::New(env, reconstructedText.c_str());
}