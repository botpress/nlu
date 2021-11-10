
#include "../fastText/src/fasttext.h"

#include "../fastText/src/args.h"
#include "../fastText/src/densematrix.h"
#include "../fastText/src/quantmatrix.h"
#include "../fastText/src/dictionary.h"
#include "../fastText/src/matrix.h"
#include "../fastText/src/meter.h"
#include "../fastText/src/model.h"
#include "../fastText/src/real.h"
#include "../fastText/src/utils.h"
#include "../fastText/src/vector.h"

using namespace fasttext;

class FastTextNapi : public FastText
{
public:
  struct ModelInfo loadAndGetModel(const std::string &filename);
  struct ModelInfo loadAndGetModel(std::istream &in);

  void saveVectors();
  void saveModel();
};

struct ModelInfo
{
  std::shared_ptr<Model> model;
  std::shared_ptr<Args> args;
  std::shared_ptr<Dictionary> dict;
};
