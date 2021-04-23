# When building for Linux, we're replacing 'int32_t' by 'uint32_t' to fix a weird memory issue in fastText

perl -pi -e 's/std::unordered_map<int32_t, int32_t> pruneidx_;/std::unordered_map<uint32_t, uint32_t> pruneidx_;/g' fastText/src/dictionary.h
