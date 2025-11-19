import type { ReadabilityScore } from "@shared/schema";

interface TextMetrics {
  sentences: number;
  words: number;
  syllables: number;
  polysyllables: number;
}

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;
  
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

function getTextMetrics(text: string): TextMetrics {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length || 1;
  
  const words = text
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);
  
  let syllables = 0;
  let polysyllables = 0;
  
  words.forEach(word => {
    const sylCount = countSyllables(word);
    syllables += sylCount;
    if (sylCount >= 3) {
      polysyllables++;
    }
  });
  
  return {
    sentences,
    words: words.length,
    syllables,
    polysyllables,
  };
}

function calculateFleschReadingEase(metrics: TextMetrics): number {
  const avgSyllablesPerWord = metrics.syllables / metrics.words;
  const avgWordsPerSentence = metrics.words / metrics.sentences;
  
  return 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
}

function calculateFleschKincaid(metrics: TextMetrics): number {
  const avgSyllablesPerWord = metrics.syllables / metrics.words;
  const avgWordsPerSentence = metrics.words / metrics.sentences;
  
  return (0.39 * avgWordsPerSentence) + (11.8 * avgSyllablesPerWord) - 15.59;
}

function calculateSMOG(metrics: TextMetrics): number {
  const polysyllablesPerSentence = metrics.polysyllables / metrics.sentences;
  return 1.0430 * Math.sqrt(polysyllablesPerSentence * 30) + 3.1291;
}

function calculateComposite(fre: number, fk: number, smog: number): number {
  const freNormalized = Math.max(0, Math.min(100, 100 - fre));
  const fkNormalized = Math.max(0, Math.min(100, (fk / 20) * 100));
  const smogNormalized = Math.max(0, Math.min(100, (smog / 20) * 100));
  
  const composite = (freNormalized + fkNormalized + smogNormalized) / 3;
  return Math.round(composite);
}

export function calculateReadability(
  labelId: string,
  drugName: string,
  labelText: string,
  snapshotDate: string
): ReadabilityScore {
  const metrics = getTextMetrics(labelText);
  
  const fleschReadingEase = calculateFleschReadingEase(metrics);
  const fleschKincaidGrade = calculateFleschKincaid(metrics);
  const smog = calculateSMOG(metrics);
  const composite = calculateComposite(fleschReadingEase, fleschKincaidGrade, smog);
  
  return {
    labelId,
    drugName,
    fleschReadingEase,
    fleschKincaidGrade,
    smog,
    composite,
    wordCount: metrics.words,
    snapshotDate,
  };
}
