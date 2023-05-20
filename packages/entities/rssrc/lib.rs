/**
 * This file contains the essence of the list engine.
 * The current plan is to get rid of lodash and translate it to Rust for speed.
 */

/**
 * #######################
 * ###    0. lodash    ###
 * #######################
 */

fn range(n: i32) -> Vec<i32> {
    let mut res = vec![];
    for i in 0..n {
        res.push(i);
    }
    res
}

fn every<T, F>(arr: &[T], predicate: F) -> bool
where
    F: Fn(&T) -> bool,
{
    for x in arr {
        if !predicate(x) {
            return false;
        }
    }
    true
}

fn some<T, F>(arr: &[T], predicate: F) -> bool
where
    F: Fn(&T) -> bool,
{
    for x in arr {
        if predicate(x) {
            return true;
        }
    }
    false
}

fn take_while<T, F>(arr: &[T], predicate: F) -> Vec<T>
where
    F: Fn(&T) -> bool,
    T: Clone,
{
    let mut res = vec![];
    for x in arr {
        if predicate(x) {
            res.push(x.clone());
        } else {
            break;
        }
    }
    res
}

fn intersection<T: PartialEq>(arr1: &[T], arr2: &[T]) -> Vec<T> {
    let mut res = vec![];
    for x in arr1 {
        if arr2.contains(x) {
            res.push(x.clone());
        }
    }
    res
}

fn union<T: PartialEq + Clone>(arr1: &[T], arr2: &[T]) -> Vec<T> {
    let mut res = vec![];
    for x in arr1 {
        if !res.contains(x) {
            res.push(x.clone());
        }
    }
    for x in arr2 {
        if !res.contains(x) {
            res.push(x.clone());
        }
    }
    res
}

fn mean(arr: &[f64]) -> f64 {
    let sum: f64 = arr.iter().sum();
    sum / arr.len() as f64
}

fn sum_by<T, F>(arr: &[T], f: F) -> f64
where
    F: Fn(&T) -> f64,
{
    let mut sum = 0.0;
    for x in arr {
        sum += f(x);
    }
    sum
}

fn order_by<T, F>(arr: &[T], f: F, order: &str) -> Vec<T>
where
    F: Fn(&T) -> f64,
    T: Clone,
{
    let mut res = arr.to_vec();
    res.sort_by(|a, b| {
        let fa = f(a);
        let fb = f(b);
        if fa < fb {
            if order == "asc" {
                return std::cmp::Ordering::Less;
            } else {
                return std::cmp::Ordering::Greater;
            }
        } else if fa > fb {
            if order == "asc" {
                return std::cmp::Ordering::Greater;
            } else {
                return std::cmp::Ordering::Less;
            }
        } else {
            return std::cmp::Ordering::Equal;
        }
    });
    res
}

fn uniq<T: PartialEq + Clone>(arr: &[T]) -> Vec<T> {
    let mut res = vec![];
    for x in arr {
        if !res.contains(x) {
            res.push(x.clone());
        }
    }
    res
}

/**
 * ########################
 * ###    1. strings    ###
 * ########################
 */

/**
 * Returns the jaro-winkler similarity between two strings
 * @param s1 String A
 * @param s2 String B
 * @returns A number between 0 and 1, where 1 means very similar
 */
fn jaro_winkler_similarity(s1: &str, s2: &str, options: Option<bool>) -> f64 {
    let options = options.unwrap_or(true);
    let mut m = 0;

    // Exit early if either are empty.
    if s1.is_empty() || s2.is_empty() {
        return 0.0;
    }

    // Convert to upper if case-sensitive is false.
    let (s1, s2) = if !options {
        (s1.to_uppercase(), s2.to_uppercase())
    } else {
        (s1.to_string(), s2.to_string())
    };

    // Exit early if they're an exact match.
    if s1 == s2 {
        return 1.0;
    }

    let range = (s1.len().max(s2.len()) / 2) - 1;
    let mut s1_matches = vec![false; s1.len()];
    let mut s2_matches = vec![false; s2.len()];

    for (i, c1) in s1.chars().enumerate() {
        let low = i.saturating_sub(range);
        let high = (i + range).min(s2.len() - 1);

        for j in low..=high {
            let c2 = s2.chars().nth(j).unwrap();
            if !s1_matches[i] && !s2_matches[j] && c1 == c2 {
                m += 1;
                s1_matches[i] = true;
                s2_matches[j] = true;
                break;
            }
        }
    }

    // Exit early if no matches were found.
    if m == 0 {
        return 0.0;
    }

    // Count the transpositions.
    let mut k = 0;
    let mut num_trans = 0;

    for (i, is_match) in s1_matches.iter().enumerate() {
        if *is_match {
            if let Some(j) = s2_matches.iter().skip(k).position(|&is_match| is_match) {
                k += j + 1;
            }

            if s1.chars().nth(i) != s2.chars().nth(k) {
                num_trans += 1;
            }
        }
    }

    let weight = (m as f64 / s1.len() as f64
        + m as f64 / s2.len() as f64
        + (m - num_trans / 2) as f64 / m as f64)
        / 3.0;
    let mut l = 0;
    let p = 0.1;

    if weight > 0.7 {
        for (c1, c2) in s1.chars().zip(s2.chars()).take(4) {
            if c1 == c2 {
                l += 1;
            } else {
                break;
            }
        }

        return weight + l as f64 * p * (1.0 - weight);
    }

    weight
}

/**
* Returns the levenshtein similarity between two strings
* sim(a, b) = (|b| - dist(a, b)) / |b| where |a| < |b|
* sim(a, b) ∈ [0, 1]
* @returns the proximity between 0 and 1, where 1 is very close
*/
fn levenshtein_similarity(a: &str, b: &str) -> f64 {
    let len = a.len().max(b.len());
    let dist = levenshtein_distance(a, b);
    (len - dist) as f64 / len as f64
}

/**
* Returns the levenshtein distance two strings, i.e. the # of operations required to go from a to b
* dist(a, b) ∈ [0, max(|a|, |b|)]
*/
fn levenshtein_distance(a: &str, b: &str) -> usize {
    if a.is_empty() || b.is_empty() {
        return 0;
    }

    let (a, b) = if a.len() > b.len() { (b, a) } else { (a, b) };

    let alen = a.len();
    let blen = b.len();
    let mut row = (0..=alen).collect::<Vec<usize>>();

    for (i, c2) in b.chars().enumerate().skip(1) {
        let mut res = i;
        for (j, &c1) in a.chars().enumerate().skip(1) {
            let tmp = row[j - 1];
            row[j - 1] = res;
            res = if c1 == c2 {
                tmp
            } else {
                tmp.min(res + 1).min(row[j] + 1)
            };
        }
        row[alen] = res;
    }

    row[alen]
}

/**
 * #####################
 * ###   2. tokens   ###
 * #####################
 */

#[derive(Debug)]
struct Token {
    value: String,
    is_word: bool,
    is_space: bool,
    start_char: usize,
    end_char: usize,
    start_token: usize,
    end_token: usize,
}

const SPECIAL_CHARSET: [&str; 35] = [
    "¿", "÷", "≥", "≤", "µ", "˜", "∫", "√", "≈", "æ", "…", "¬", "˚", "˙", "©", "+", "-", "_", "!",
    "@", "#", "$", "%", "?", "&", "*", "(", ")", "/", "\\", "[", "]", "{", "}", ":", ";", "<", ">",
    "=", ".", ",", "~", "`", "\"", "'",
];

fn is_word(str: &str) -> bool {
    !SPECIAL_CHARSET.iter().any(|c| str.contains(c)) && !has_space(str)
}

fn has_space(str: &str) -> bool {
    str.contains(' ')
}

fn is_space(str: &str) -> bool {
    str.chars().all(|c| c == ' ')
}

fn to_tokens(str_tokens: &[&str]) -> Vec<Token> {
    let mut tokens = Vec::new();
    let mut char_index = 0;

    for (i, &str_token) in str_tokens.iter().enumerate() {
        let token = Token {
            value: str_token.to_string(),
            is_word: is_word(str_token),
            is_space: is_space(str_token),
            start_char: char_index,
            end_char: char_index + str_token.len(),
            start_token: i,
            end_token: i + 1,
        };

        tokens.push(token);
        char_index += str_token.len();
    }

    tokens
}

/**
 * #####################
 * ###   3. parser   ###
 * #####################
 */

const ENTITY_SCORE_THRESHOLD: f64 = 0.6;

fn take_until(arr: &[Token], start: usize, desired_length: usize) -> Vec<Token> {
    let mut total = 0;
    let result: Vec<Token> = arr[start..]
        .iter()
        .take_while(|t| {
            let to_add = t.value.len();
            let current = total;
            if current > 0
                && (desired_length - current).abs() < (desired_length - current - to_add).abs()
            {
                // better off as-is
                return false;
            } else {
                // we're closed to desired if we add a new token
                total += to_add;
                return current < desired_length;
            }
        })
        .cloned()
        .collect();

    if let Some(last_token) = result.last() {
        if last_token.is_space {
            result.pop();
        }
    }

    result
}

fn compute_exact_score(a: &[String], b: &[String]) -> f64 {
    let str1 = a.join("");
    let str2 = b.join("");
    let min = str1.len().min(str2.len());
    let max = str1.len().max(str2.len());
    let mut score = 0;

    for i in 0..min {
        if str1.as_bytes()[i] == str2.as_bytes()[i] {
            score += 1;
        }
    }

    score as f64 / max as f64
}

fn compute_fuzzy_score(a: &[String], b: &[String]) -> f64 {
    let str1 = a.join("");
    let str2 = b.join("");
    let d1 = levenshtein_similarity(&str1, &str2);
    let d2 = jaro_winkler_similarity(&str1, &str2, false);
    (d1 + d2) / 2.0
}

fn compute_structural_score(a: &[String], b: &[String]) -> f64 {
    let charset1: Vec<char> = a.iter().flat_map(|x| x.chars()).collect();
    let charset2: Vec<char> = b.iter().flat_map(|x| x.chars()).collect();
    let charset_score =
        intersection(&charset1, &charset2).len() as f64 / union(&charset1, &charset2).len() as f64;
    let charset_low1: Vec<char> = charset1.iter().map(|c| c.to_ascii_lowercase()).collect();
    let charset_low2: Vec<char> = charset2.iter().map(|c| c.to_ascii_lowercase()).collect();
    let charset_low_score = intersection(&charset_low1, &charset_low2).len() as f64
        / union(&charset_low1, &charset_low2).len() as f64;
    let final_charset_score = (charset_score + charset_low_score) / 2.0;

    let la = a.iter().filter(|x| x.len() > 1).count().max(1);
    let lb = b.iter().filter(|x| x.len() > 1).count().max(1);
    let token_qty_score = la.min(lb) as f64 / la.max(lb) as f64;

    let size1: usize = a.iter().map(|x| x.len()).sum();
    let size2: usize = b.iter().map(|x| x.len()).sum();
    let token_size_score = size1.min(size2) as f64 / size1.max(size2) as f64;

    (final_charset_score * token_qty_score * token_size_score).sqrt()
}

struct Candidate {
    score: f64,
    canonical: String,
    start: usize,
    end: usize,
    source: String,
    occurrence: String,
    eliminated: bool,
}

struct ListEntityModel {
    name: String,
    fuzzy: f64,
    tokens: HashMap<String, Vec<Vec<String>>>,
}

struct ListEntityExtraction {
    name: String,
    confidence: f64,
    value: String,
    source: String,
    char_start: usize,
    char_end: usize,
}

fn extract_for_list_model(
    str_tokens: &[String],
    list_model: &ListEntityModel,
) -> Vec<ListEntityExtraction> {
    let mut candidates: Vec<Candidate> = Vec::new();
    let mut longest_candidate = 0;

    let tokens = to_tokens(str_tokens);

    for (canonical, occurrences) in &list_model.tokens {
        for occurrence in occurrences {
            for i in 0..tokens.len() {
                if tokens[i].is_space {
                    continue;
                }

                let workset = take_until(&tokens, i, occurrence.iter().map(|o| o.len()).sum());
                let workset_str_low: Vec<String> =
                    workset.iter().map(|x| x.value.to_lowercase()).collect();
                let workset_str_wcase: Vec<String> =
                    workset.iter().map(|x| x.value.clone()).collect();
                let candidate_as_string = occurrence.join("");

                if candidate_as_string.len() > longest_candidate {
                    longest_candidate = candidate_as_string.len();
                }

                let exact_score = if compute_exact_score(&workset_str_wcase, occurrence) == 1.0 {
                    1.0
                } else {
                    0.0
                };

                let fuzzy = list_model.fuzzy < 1.0 && workset_str_low.join("").len() >= 4;
                let fuzzy_score = compute_fuzzy_score(
                    &workset_str_low,
                    &occurrence
                        .iter()
                        .map(|t| t.to_lowercase())
                        .collect::<Vec<String>>(),
                );
                let fuzzy_factor = if fuzzy_score >= list_model.fuzzy {
                    fuzzy_score
                } else {
                    0.0
                };

                let structural_score = compute_structural_score(&workset_str_wcase, occurrence);
                let final_score = if fuzzy {
                    fuzzy_factor * structural_score
                } else {
                    exact_score * structural_score
                };

                candidates.push(Candidate {
                    score: final_score,
                    canonical: canonical.clone(),
                    start: i,
                    end: i + workset.len() - 1,
                    source: workset.iter().map(|t| t.value.clone()).collect(),
                    occurrence: occurrence.join(""),
                    eliminated: false,
                });
            }
        }

        for i in 0..tokens.len() {
            let results: Vec<&Candidate> = candidates
                .iter()
                .filter(|x| !x.eliminated && x.start <= i && x.end >= i)
                .collect();
            if results.len() > 1 {
                let (_, losers) = results.split_at(1);
                losers.iter().for_each(|x| x.eliminated = true);
            }
        }
    }

    let results: Vec<ListEntityExtraction> = candidates
        .into_iter()
        .filter(|x| !x.eliminated && x.score >= ENTITY_SCORE_THRESHOLD)
        .map(|match_| ListEntityExtraction {
            name: list_model.name.clone(),
            confidence: match_.score,
            char_start: tokens[match_.start].start_char,
            char_end: tokens[match_.end].start_char + tokens[match_.end].value.len(),
            value: match_.canonical,
            source: match_.source,
        })
        .collect();

    results
}

// TODO: export ListEntityModel, ListEntityExtraction, extract_for_list_model
