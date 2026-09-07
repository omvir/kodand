/**
 * KODAND content metrics calculator — readability, tone, keyword density,
 * reading time. Pure functions, no external dependencies.
 *
 * Used by the Content Optimizer scan mode.
 */

const STOP_WORDS = new Set([
  // English stop words
  "a", "an", "the", "and", "or", "but", "if", "then", "else", "of", "at", "by",
  "for", "with", "about", "to", "from", "in", "on", "off", "out", "over", "under",
  "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do",
  "does", "did", "will", "would", "should", "could", "may", "might", "must",
  "shall", "can", "this", "that", "these", "those", "i", "you", "he", "she",
  "it", "we", "they", "me", "him", "her", "us", "them", "my", "your", "his",
  "hers", "its", "our", "their", "as", "so", "not", "no", "yes", "very", "just",
  "than", "too", "also", "only", "any", "all", "some", "more", "most", "other",
  "such", "own", "same", "few", "further", "now", "here", "there", "when",
  "where", "why", "how", "what", "which", "who", "whom",
]);

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  word = word.replace(/^y/, "");
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

function splitIntoSentences(text: string): string[] {
  // Simple sentence splitter — handles ., !, ? but ignores common abbreviations.
  const sentences = text
    .replace(/([.!?])\s+(?=[A-Z0-9"'])/g, "$1\n")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return sentences.length ? sentences : text.split(/\n+/).filter(Boolean);
}

function splitIntoParagraphs(text: string): string[] {
  return text.split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean);
}

function splitIntoWords(text: string): string[] {
  return (text.match(/\b[a-zA-Z][a-zA-Z'-]*\b/g) || []).filter((w) => w.length > 0);
}

/**
 * Compute Content Metrics for the Content Optimizer scan.
 *
 * Returns:
 *   - wordCount, sentenceCount, paragraphCount
 *   - avgWordsPerSentence, avgSyllablesPerWord
 *   - Flesch Reading Ease (0-100, higher = easier)
 *   - Flesch-Kincaid Grade Level
 *   - Gunning Fog index
 *   - readingTimeMin, readingLevel
 *   - topKeywords (top 10 by frequency, with density %)
 *   - tone (formal / neutral / casual)
 *   - passiveVoiceSentences (estimate)
 *   - longSentences (>20 words)
 *   - uniqueWords, typeTokenRatio
 */
export function computeContentMetrics(text: string): import("./audit-types").ContentMetrics {
  const trimmed = (text || "").trim();
  if (!trimmed) {
    return {
      wordCount: 0,
      sentenceCount: 0,
      paragraphCount: 0,
      avgWordsPerSentence: 0,
      avgSyllablesPerWord: 0,
      fleschReadingEase: 0,
      fleschKincaidGrade: 0,
      gunningFog: 0,
      readingTimeMin: 0,
      readingLevel: "—",
      topKeywords: [],
      tone: "neutral",
      passiveVoiceSentences: 0,
      longSentences: 0,
      uniqueWords: 0,
      typeTokenRatio: 0,
    };
  }

  const words = splitIntoWords(trimmed);
  const wordCount = words.length;
  const sentences = splitIntoSentences(trimmed);
  const sentenceCount = Math.max(1, sentences.length);
  const paragraphs = splitIntoParagraphs(trimmed);
  const paragraphCount = Math.max(1, paragraphs.length);

  const totalSyllables = words.reduce((s, w) => s + countSyllables(w), 0);
  const avgWordsPerSentence = wordCount / sentenceCount;
  const avgSyllablesPerWord = wordCount > 0 ? totalSyllables / wordCount : 0;

  // Flesch Reading Ease: 206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
  const fleschReadingEase = Math.max(
    0,
    Math.min(
      100,
      206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord
    )
  );

  // Flesch-Kincaid Grade: 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
  const fleschKincaidGrade = Math.max(
    0,
    0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59
  );

  // Gunning Fog: 0.4 * [(words/sentences) + 100 * (complex words / words)]
  // where complex words = words with 3+ syllables
  const complexWords = words.filter((w) => countSyllables(w) >= 3).length;
  const gunningFog = Math.max(
    0,
    0.4 * (avgWordsPerSentence + 100 * (complexWords / Math.max(1, wordCount)))
  );

  // Reading time — assume 200 WPM
  const readingTimeMin = Math.max(1, Math.round(wordCount / 200));

  // Reading level label
  let readingLevel = "—";
  if (fleschReadingEase >= 90) readingLevel = "Elementary (5th grade)";
  else if (fleschReadingEase >= 70) readingLevel = "Middle School (6-7th grade)";
  else if (fleschReadingEase >= 60) readingLevel = "High School (8-9th grade)";
  else if (fleschReadingEase >= 50) readingLevel = "College (10-12th grade)";
  else if (fleschReadingEase >= 30) readingLevel = "College Graduate";
  else readingLevel = "Professional";

  // Top 10 keywords (excluding stop words)
  const freq: Record<string, number> = {};
  for (const w of words) {
    const lw = w.toLowerCase();
    if (STOP_WORDS.has(lw) || lw.length < 3) continue;
    freq[lw] = (freq[lw] || 0) + 1;
  }
  const topKeywords = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({
      word,
      count,
      density: (count / wordCount) * 100,
    }));

  // Tone estimate — count contractions vs. formal indicators
  const contractionCount = (trimmed.match(/\b\w+'(?:t|re|s|m|ve|ll|d)\b/gi) || []).length;
  const formalMarkers =
    (trimmed.match(/\b(?:therefore|however|furthermore|moreover|nevertheless|consequently|accordingly|henceforth|thereof)\b/gi) || []).length;
  const firstPersonCount =
    (trimmed.match(/\b(?:i|i'm|i've|i'll|i'd|my|mine|we|our|ours|us)\b/gi) || []).length;
  let tone: "formal" | "neutral" | "casual" = "neutral";
  const casualScore = contractionCount + firstPersonCount * 0.5;
  const formalScore = formalMarkers;
  if (casualScore > formalScore + 3) tone = "casual";
  else if (formalScore > casualScore + 1) tone = "formal";

  // Passive voice estimate — look for "was/were/been/is/are + past-participle (-ed or 3rd form)"
  let passiveVoiceSentences = 0;
  for (const s of sentences) {
    if (/\b(?:was|were|been|is|are|be|being)\s+\w+(?:ed|en)\b/i.test(s) || /\b(?:was|were|is|are)\s+(?:built|made|done|seen|taken|given|shown|written|used|known|found|kept|held|led|set|put|read)\b/i.test(s)) {
      passiveVoiceSentences++;
    }
  }

  // Long sentences (>20 words)
  const longSentences = sentences.filter((s) => splitIntoWords(s).length > 20).length;

  // Unique words + Type-Token Ratio (vocabulary richness)
  const uniqueWords = new Set(words.map((w) => w.toLowerCase())).size;
  const typeTokenRatio = wordCount > 0 ? uniqueWords / wordCount : 0;

  return {
    wordCount,
    sentenceCount,
    paragraphCount,
    avgWordsPerSentence,
    avgSyllablesPerWord,
    fleschReadingEase,
    fleschKincaidGrade,
    gunningFog,
    readingTimeMin,
    readingLevel,
    topKeywords,
    tone,
    passiveVoiceSentences,
    longSentences,
    uniqueWords,
    typeTokenRatio,
  };
}
