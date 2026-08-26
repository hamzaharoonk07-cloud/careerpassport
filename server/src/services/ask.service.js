/**
 * Free-text career matching.
 *
 * Someone types how they actually think about themselves — "I like maths but
 * I hate presenting" — and gets destinations that fit, with the reason
 * attached. It is not a chatbot and there is no model behind it: every
 * answer is derived from the careers already in the database, so it works
 * offline, costs nothing per query, and cannot invent a job that does not
 * exist.
 *
 * Three things it has to get right:
 *
 *   1. Negation. "I hate presenting" must push away from presenting-heavy
 *      work, not toward it. A bag-of-words matcher gets this exactly
 *      backwards, which is worse than returning nothing.
 *
 *   2. Saying why. A list of titles is not an answer — the reason is what
 *      lets someone judge whether the match is any good.
 *
 *   3. Admitting when it has nothing. Text with no recognisable signal
 *      should say so rather than ranking the whole bank by noise.
 */

const AXES = ['R', 'I', 'A', 'S', 'E', 'C'];

const AXIS_NAMES = {
  R: 'hands-on work', I: 'analysis and problem-solving', A: 'creative work',
  S: 'working with people', E: 'leading and persuading', C: 'precision and structure',
};

/**
 * Phrases that signal a trait, in the words people actually use.
 *
 * Deliberately a fixed vocabulary rather than anything learned: it can be
 * read, argued with and corrected, which matters more here than coverage.
 */
const SIGNALS = [
  { axis: 'I', words: ['maths', 'math', 'mathematics', 'physics', 'research', 'analysis', 'analyse', 'analyze', 'data', 'statistics', 'science', 'problem solving', 'problems', 'puzzles', 'logic', 'investigate', 'why things work'] },
  { axis: 'R', words: ['building', 'build', 'hands on', 'hands-on', 'machines', 'repair', 'fixing', 'fix', 'engineering', 'practical', 'outdoors', 'equipment', 'hardware', 'making things work'] },
  { axis: 'A', words: ['design', 'designing', 'drawing', 'art', 'creative', 'creativity', 'writing', 'music', 'film', 'photography', 'aesthetic', 'imagination', 'making things'] },
  { axis: 'S', words: ['helping', 'help people', 'teaching', 'teach', 'people', 'care', 'caring', 'health', 'patients', 'counselling', 'community', 'social', 'listening', 'nursing', 'therapy'] },
  { axis: 'E', words: ['business', 'startup', 'selling', 'sales', 'leading', 'leadership', 'managing', 'manage', 'persuading', 'pitching', 'entrepreneur', 'money', 'negotiating', 'presenting', 'presentations', 'public speaking', 'speaking', 'meetings', 'clients'] },
  { axis: 'C', words: ['office', 'admin', 'organising', 'organizing', 'accounting', 'accounts', 'detail', 'details', 'accuracy', 'precision', 'order', 'planning', 'rules', 'process', 'spreadsheets', 'audit'] },
];

/** Phrases that flip the sentiment of whatever follows them. */
const NEGATORS = [
  'hate', 'hates', 'dislike', 'dislikes', 'not good at', 'no good at', 'bad at',
  'avoid', 'avoiding', 'cannot stand', "can't stand", 'do not like', "don't like",
  'do not enjoy', "don't enjoy", 'never', 'without', 'rather not', 'no interest in',
  // Bare 'not' carries most negations in ordinary writing — "not office work".
  'not ', "n't ",
];

/** Common words that carry no signal about a career. */
const STOPWORDS = new Set([
  'with', 'good', 'have', 'like', 'love', 'want', 'that', 'this', 'they', 'them',
  'from', 'about', 'would', 'could', 'should', 'really', 'very', 'much', 'more',
  'most', 'some', 'been', 'being', 'because', 'when', 'what', 'where', 'which',
  'into', 'than', 'then', 'also', 'just', 'know', 'think', 'feel', 'make', 'made',
  'doing', 'does', 'work', 'working', 'career', 'careers', 'job', 'jobs', 'role',
  'something', 'things', 'thing', 'people',
]);

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9\s'-]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Split on the connectives people use to change direction mid-sentence, so
 * "I like maths but I hate presenting" is read as two separate statements
 * rather than one confused one.
 */
function clauses(text) {
  // Punctuation first, then connectives, and no regex escapes anywhere.
  // An earlier version used a word-boundary escape that reached the file as
  // a literal control byte, so the pattern silently never matched: every
  // sentence was read as one clause, a trailing 'not' negated the whole
  // thing, and "I like maths but I hate presenting" came back as disliking
  // maths. Plain string splitting cannot be corrupted that way.
  let out = String(text || '').toLowerCase();
  for (const ch of [',', ';', '.', '!', '?']) out = out.split(ch).join('|');
  for (const c of [' but ', ' however ', ' although ', ' though ', ' whereas ']) {
    out = out.split(c).join('|');
  }
  return out.split('|').map((c) => norm(c)).filter(Boolean);
}


/** Is this clause expressing dislike? */
const isNegative = (clause) => NEGATORS.some((n) => clause.includes(n));

/**
 * Read the text into a signed trait vector and the terms that produced it.
 *
 * Returned alongside the vector so the caller can explain itself; a score
 * nobody can trace is not much better than a guess.
 */
export function readText(text) {
  const wanted = Object.fromEntries(AXES.map((a) => [a, 0]));
  const matchedTerms = [];
  const avoidedTerms = [];

  for (const clause of clauses(text)) {
    const negative = isNegative(clause);
    for (const { axis, words } of SIGNALS) {
      for (const w of words) {
        if (!clause.includes(w)) continue;
        wanted[axis] += negative ? -1.5 : 1;
        (negative ? avoidedTerms : matchedTerms).push(w);
      }
    }
  }

  const signal = AXES.reduce((n, a) => n + Math.abs(wanted[a]), 0);
  return { wanted, matchedTerms: [...new Set(matchedTerms)], avoidedTerms: [...new Set(avoidedTerms)], signal };
}

/**
 * Rank careers against free text.
 *
 * @returns {{ matches: Array, read: object }} — matches is empty when the
 *          text carried no usable signal, which the caller should say aloud
 *          rather than filling with the highest-scoring noise.
 */
export function askCareers(text, careers, limit = 6) {
  const read = readText(text);
  // Length alone is a poor filter — it let "with", "good" and "have" into the
  // explanation, which made the reasons read like nonsense even when the
  // ranking was sound.
  const words = norm(text)
    .split(' ')
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));

  // Nothing recognisable. Returning a ranked list here would be inventing
  // confidence out of an empty reading.
  if (read.signal === 0 && words.length === 0) return { matches: [], read };

  const scored = careers.map((career) => {
    let score = 0;
    const reasons = [];

    // 1. Trait alignment, positive and negative.
    for (const a of AXES) {
      const want = read.wanted[a];
      if (!want) continue;
      const has = (career.riasec?.[a] ?? 0) / 10;
      score += want * has * 10;
    }

    // 2. Words that appear in what the role actually is.
    const haystack = norm(
      `${career.title} ${career.summary} ${career.description} ${(career.skills || []).map((s) => s.name).join(' ')}`
    );
    const hits = words.filter((w) => haystack.includes(w));
    score += hits.length * 6;

    if (hits.length) {
      reasons.push(`You mentioned ${hits.slice(0, 3).join(', ')} — that appears in what this role does day to day.`);
    }

    const topWanted = AXES.filter((a) => read.wanted[a] > 0)
      .sort((x, y) => read.wanted[y] - read.wanted[x])[0];
    if (topWanted && (career.riasec?.[topWanted] ?? 0) >= 6) {
      reasons.push(`It leans heavily on ${AXIS_NAMES[topWanted]}, which is what you described wanting.`);
    }

    const avoided = AXES.filter((a) => read.wanted[a] < 0);
    for (const a of avoided) {
      if ((career.riasec?.[a] ?? 0) <= 4) {
        reasons.push(`It asks comparatively little of ${AXIS_NAMES[a]}, which you said you would rather avoid.`);
        break;
      }
    }

    return { career, score, reasons };
  });

  const matches = scored
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // Rescale to something readable without implying the precision of the
  // quiz — this is a text match, not a measured profile.
  const best = matches[0]?.score || 1;
  return {
    matches: matches.map((m) => ({
      career: m.career,
      strength: Math.max(35, Math.min(95, Math.round((m.score / best) * 90))),
      reasons: m.reasons.length ? m.reasons : ['It overlaps with what you described, though loosely.'],
    })),
    read,
  };
}
