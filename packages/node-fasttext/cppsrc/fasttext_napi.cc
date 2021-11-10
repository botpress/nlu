#include "fasttext_napi.h"

ModelInfo FastTextNapi::loadAndGetModel(const std::string &filename)
{
  FastText::loadModel(filename);
  return {model_, args_, dict_};
}

ModelInfo FastTextNapi::loadAndGetModel(std::istream &in)
{
  FastText::loadModel(in);
  return {model_, args_, dict_};
}

void FastTextNapi::saveModel()
{
  std::string fn(args_->output);
  if (quant_)
  {
    fn += ".ftz";
  }
  else
  {
    fn += ".bin";
  }
  FastText::saveModel(fn);
}

void FastTextNapi::saveVectors()
{
  FastText::saveVectors(args_->output + ".vec");
}
