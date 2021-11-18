{
  "targets": [
    {
      "target_name": "crfsuite",
      "cflags_cc": [
        "-std=c++11",
        "-pthread",
        "-fexceptions",
        "-O3",
        "-Wall",
        "-Wno-sign-compare",
        "-pedantic",
        "-DUSE_SSE",
        "-DUSE_SSE2"
      ],
      "conditions": [
        [ "OS=='linux'", {
          "cflags+": [ "-std=c++11", "-fexceptions" ],
          "cflags_c+": [ "-std=c++11", "-fexceptions" ],
          "cflags_cc+": [ "-std=c++11", "-fexceptions" ],
        }],
        [ "OS=='freebsd'", {
          "cflags+": [ "-std=c++11", "-fexceptions" ],
          "cflags_c+": [ "-std=c++11", "-fexceptions" ],
          "cflags_cc+": [ "-std=c++11", "-fexceptions" ],
        }],
        [ "OS=='mac'", {
          "cflags+": [ "-stdlib=libc++" ],
          "xcode_settings": {
            "OTHER_CPLUSPLUSFLAGS" : [ "-std=c++11", "-stdlib=libc++", "-pthread" ],
            "OTHER_LDFLAGS": [ "-stdlib=libc++" ],
            "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
            "MACOSX_DEPLOYMENT_TARGET": "10.7",
            "CLANG_CXX_LANGUAGE_STANDARD":"c++11",
            "CLANG_CXX_LIBRARY": "libc++"
          },
        }],
        [
        "OS=='win'", {
          "cflags": [
            "-Wall"
          ],
          "defines": [
            "WIN"
          ],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": "2",
              "DisableSpecificWarnings": [
                "4244"
              ],
            },
            "VCLinkerTool": {
              "LinkTimeCodeGeneration": 1,
              "OptimizeReferences": 2,
              "EnableCOMDATFolding": 2,
              "LinkIncremental": 1,
            }
          }
        }]
      ],
      "sources": [
        "liblbfgs/lib/lbfgs.c",

        "crfsuite/lib/crf/src/crf1d_context.c",
        "crfsuite/lib/crf/src/crf1d_encode.c",
        "crfsuite/lib/crf/src/crf1d_feature.c",
        "crfsuite/lib/crf/src/crf1d_model.c",
        "crfsuite/lib/crf/src/crf1d_tag.c",
        "crfsuite/lib/crf/src/crfsuite.c",
        "crfsuite/lib/crf/src/crfsuite_train.c",
        "crfsuite/lib/crf/src/dataset.c",
        "crfsuite/lib/crf/src/dictionary.c",
        "crfsuite/lib/crf/src/holdout.c",
        "crfsuite/lib/crf/src/logging.c",
        "crfsuite/lib/crf/src/params.c",
        "crfsuite/lib/crf/src/quark.c",
        "crfsuite/lib/crf/src/rumavl.c",
        "crfsuite/lib/crf/src/train_arow.c",
        "crfsuite/lib/crf/src/train_averaged_perceptron.c",
        "crfsuite/lib/crf/src/train_l2sgd.c",
        "crfsuite/lib/crf/src/train_lbfgs.c",
        "crfsuite/lib/crf/src/train_passive_aggressive.c",

        "crfsuite/lib/cqdb/src/cqdb.c",
        "crfsuite/lib/cqdb/src/lookup3.c",

        "cppsrc/main.cc",
        "cppsrc/trainer_class.cc",
        "cppsrc/tagger_class.cc",
        "cppsrc/node_trainer.cc",
        "cppsrc/training_worker.cc"
      ],
      "defines": [
        "NAPI_VERSION=4"
      ],
      "include_dirs": [
        "liblbfgs/include",
        "crfsuite/include",
        "crfsuite/lib/cqdb/include",
        "<!@(node -p \"require('node-addon-api').include\")"
      ]
    }
  ]
}
