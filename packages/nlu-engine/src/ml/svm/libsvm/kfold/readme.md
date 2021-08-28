# KFold algorithms

## General

Let S be the dataset of all samples. \
Let S<sub>i</sub> be the set of all samples of class i. \
Let k be the number of desired folds. \
Let n be the amount of samples. \
Let n<sub>i</sub> be the amount of samples of class i. \
Let n<sub>~i</sub> be the amount of samples with a class different than i.

### Folds

k must always be in range [1, n]. If k === 1, the dataset is simply returned as is. If k > n, then there is more folds than samples which is invalid.

When n is a multiple of k (n === 0 mod k), the amount of samples per folds is n / k. Else, the first n % k folds have ⌈n / k⌉ samples and the rest have ⌊n / k⌋.

### Classes

The least and most represented class are given by:

mrc = amax<sub>i</sub>(n<sub>i</sub>) \
lrc = amin<sub>i</sub>(n<sub>i</sub>)

The amount of samples in the least and most represented classes are respectively given by: n<sub>lrc</sub> and n<sub>mrc</sub>.

## Base and Random KFold

This algorithm does not ensure that class proportions are kept in each folds. This can lead to extreme scenarios and unlucky errors. Of course, this doesn't apply to cases where k === 1.

Let the non-dominant samples be samples of a class different than the mrc:

n<sub>~mrc</sub> = |{x | x ∈ S ^ x ∉ S<sub>mrc</sub> }| \
n<sub>~mrc</sub> = n - n<sub>mrc</sub>

If the amount of samples per fold is greater than the amount of non-dominant samples, then there is a chance that all non-dominant samples get shuffled in the same fold. In this scenario, there will be a training with only samples of the mrc, which will end up in a critical error.

To prevent this from happening, we must ensure that the amount of samples in a fold is always less than n<sub>~mrc</sub>:

⌈<sup>n</sup>&frasl;<sub>k</sub>⌉ < n<sub>~mrc</sub> \
⌈<sup>n</sup>&frasl;<sub>k</sub>⌉ < n - n<sub>mrc</sub> \
<sup>n</sup>&frasl;<sub>k</sub> + θ < n - n<sub>mrc</sub>, θ ∈ [0, 1) \
<sup>n</sup>&frasl;<sub>k</sub> < n - n<sub>mrc</sub> - θ \
<sup>n</sup>&frasl;<sub>(n - n<sub>mrc</sub> - θ)</sub> < k

Worst case occurs if θ === 0.99999...

<sup>n</sup>&frasl;<sub>(n - n<sub>mrc</sub> - 1)</sub> < k \
⌈<sup>n</sup>&frasl;<sub>(n - n<sub>mrc</sub> - 1)</sub>⌉ ≤ k

In other words, the min value assignable to k that ensures no error occurs is:

mink = ⌈<sup>n</sup>&frasl;<sub>(n - n<sub>mrc</sub> - 1)</sub>⌉

Unfortunatly, when n<sub>~mrc</sub> === 1, there is might possibly be no value of k (outside of k === 1) that folds the dataset without creating a invalid fold: a fold containing all non-dominant samples.

## Stratified KFold

This algorithm ensures class distributions is preserved. Unless there is only one class or n<sub>~mrc</sub> === 1, all values of k are valid.

## Examples

The following table shows safe values of k for different dataset and kfold algorithms:

| ex  | dataset                  | valid k (random kfold) | valid k (stratified kfold) |
| --- | ------------------------ | ---------------------- | -------------------------- |
| 1   | [x, x, x, x, x]          | []                     | []                         |
| 2   | [x, x, x, x, o]          | [1]                    | [1]                        |
| 3   | [x, x, x, o, o]          | [1, 5]                 | [1 ... 5]                  |
| 4   | [x, x, x, +, o]          | [1, 5]                 | [1 ... 5]                  |
| 5   | [x, x, x, x, +, +, o, o] | [1, 3 ... 8]           | [1 ... 8]                  |

Example 5 is counter intuitive. Even if n<sub>lrc</sub> is 1, the ammount of non-dominant samples n<sub>~mrc</sub> is 2. \
It is not problematic to have a fold with only one class. What is problematic is to have k - 1 folds with only one class. Therefore, the following split is perfectly acceptable:

| k1         | k2         | k3         | k4         |
| ---------- | ---------- | ---------- | ---------- |
| x, x, x, x | x, x, x, o | x, x, x, o | x, x, x, + |

This will end up giving:

| split | train set                          | test set   |
| ----- | ---------------------------------- | ---------- |
| 1     | x, x, x, x, x, x, x, o, x, x, x, o | x, x, x, + |
| 2     | x, x, x, +, x, x, x, x, x, x, x, o | x, x, x, o |
| 3     | x, x, x, o, x, x, x, +, x, x, x, x | x, x, x, o |
| 4     | x, x, x, o, x, x, x, o, x, x, x, + | x, x, x, x |

In the split configuration 4, the test set of only one class is perfectly acceptable.
