#include "node_trainer.h"

NodeTrainer::NodeTrainer(bool debug) : CRFSuite::Trainer()
{
  this->debug = debug;
}

void NodeTrainer::message(const std::string &msg)
{
  if (this->debug)
  {
    std::cout << msg;
  }
}

void NodeTrainer::progress(const int32_t iteration)
{
  if (progress_callback != NULL)
  {
    progress_callback(iteration);
  }
}
