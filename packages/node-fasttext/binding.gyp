{
    "targets": [
        {
            "target_name": "fasttext",
            "sources": [
                "fastText/src/args.cc",
                "fastText/src/args.h",
                "fastText/src/autotune.cc",
                "fastText/src/autotune.h",
                "fastText/src/densematrix.cc",
                "fastText/src/densematrix.h",
                "fastText/src/dictionary.cc",
                "fastText/src/dictionary.h",
                "fastText/src/fasttext.cc",
                "fastText/src/fasttext.h",
                "fastText/src/loss.cc",
                "fastText/src/loss.h",
                "fastText/src/main.cc",
                "fastText/src/matrix.cc",
                "fastText/src/matrix.h",
                "fastText/src/meter.cc",
                "fastText/src/meter.h",
                "fastText/src/model.cc",
                "fastText/src/model.h",
                "fastText/src/productquantizer.cc",
                "fastText/src/productquantizer.h",
                "fastText/src/quantmatrix.cc",
                "fastText/src/quantmatrix.h",
                "fastText/src/real.h",
                "fastText/src/utils.cc",
                "fastText/src/utils.h",
                "fastText/src/vector.cc",
                "fastText/src/vector.h",
                "cppsrc/node-util.cc",
                "cppsrc/node-argument.cc",
                "cppsrc/loadModel.cc",
                "cppsrc/train.cc",
                "cppsrc/quantize.cc",
                "cppsrc/predictWorker.cc",
                "cppsrc/nnWorker.cc",
                "cppsrc/wrapper.cc",
                "cppsrc/classifier.cc",
                "cppsrc/query.cc",
                "cppsrc/addon.cc",
                "cppsrc/binding-utils.cc",
                "cppsrc/vecWorker.cc",
                "cppsrc/fasttext_napi.cc",
                "cppsrc/fasttext_napi.h"
            ],
            "defines": [
                "NAPI_VERSION=3",
            ],
            "include_dirs": [
                "<!@(node -p \"require('node-addon-api').include\")"
            ],
            "cflags": [
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
            "cflags_cc!": ["-fno-rtti"],
            "conditions": [
                ["OS=='linux'", {
                    "cflags+": ["-std=c++11", "-fexceptions"],
                    "cflags_c+": ["-std=c++11", "-fexceptions"],
                    "cflags_cc+": ["-std=c++11", "-fexceptions"],
                }],
                ["OS=='freebsd'", {
                    "cflags+": ["-std=c++11", "-fexceptions"],
                    "cflags_c+": ["-std=c++11", "-fexceptions"],
                    "cflags_cc+": ["-std=c++11", "-fexceptions"],
                }],
                ["OS=='mac'", {
                    "cflags+": ["-stdlib=libc++"],
                    "xcode_settings": {
                        "OTHER_CPLUSPLUSFLAGS": ["-std=c++11", "-stdlib=libc++", "-pthread", "-frtti"],
                        "OTHER_LDFLAGS": ["-stdlib=libc++"],
                        "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
                        "MACOSX_DEPLOYMENT_TARGET": "10.7",
                        "CLANG_CXX_LANGUAGE_STANDARD":"c++11",
                        "CLANG_CXX_LIBRARY": "libc++"
                    },
                }],
                [
                "OS=='win'",
                {
                    "configurations":{
                        "Debug":{
                            "msvs_settings":{
                            "VCCLCompilerTool":{
                                "RuntimeTypeInfo":"true",
                                "EnableFunctionLevelLinking":"true",
                                "ExceptionHandling":"2",
                                "DisableSpecificWarnings":[
                                    "4244"
                                ]
                            },
                            "VCLinkerTool":{
                                "LinkTimeCodeGeneration":1,
                                "OptimizeReferences":2,
                                "EnableCOMDATFolding":2,
                                "LinkIncremental":1
                            }
                            }
                        },
                        "Release":{
                            "msvs_settings":{
                            "VCCLCompilerTool":{
                                "RuntimeTypeInfo":"true",
                                "EnableFunctionLevelLinking":"true",
                                "ExceptionHandling":"2",
                                "DisableSpecificWarnings":[
                                    "4244"
                                ]
                            },
                            "VCLinkerTool":{
                                "LinkTimeCodeGeneration":1,
                                "OptimizeReferences":2,
                                "EnableCOMDATFolding":2,
                                "LinkIncremental":1
                            }
                            }
                        }
                    }
                }
                ]
            ]
        },
        {
            "target_name": "action_after_build",
            "type": "none"
        }
    ]
}
