#ifndef _NODE_TRAINER_H_
#define _NODE_TRAINER_H_

#include <iostream>
#include <functional>
#include <crfsuite_api.hpp>

class NodeTrainer : public CRFSuite::Trainer
{
public:
  NodeTrainer(bool debug);
  virtual void message(const std::string &msg);
  virtual void progress(const int32_t iteration);
  std::function<void(const int32_t iteration)> progress_callback;
  bool debug = false;
};

#endif