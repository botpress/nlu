{
    "targets": [{
        "target_name": "node-svm",
        'cflags': ['-Wall', '-O3', '-fPIC', '-c', '-std=c++11'],
        "sources": [
            "libsvm/svm.cpp",
            "cppsrc/main.cpp",
            "cppsrc/hello_world.cpp",
            "cppsrc/nsvm.cpp",
            "cppsrc/utils.cpp",
            "cppsrc/type_check.cpp",
            "cppsrc/train.cpp",
            "cppsrc/training_worker.cpp",
            "cppsrc/predict_worker.cpp",
            "cppsrc/predict_prob_worker.cpp"
        ],
        'include_dirs': [
            "<!@(node -p \"require('node-addon-api').include\")"
        ],
        'dependencies': [
            "<!(node -p \"require('node-addon-api').gyp\")"
        ],
        'defines': ['NAPI_DISABLE_CPP_EXCEPTIONS']
    }]
}
