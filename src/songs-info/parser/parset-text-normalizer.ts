import * as jaroWinkler from 'jaro-winkler';
import { fuzzy } from 'fast-fuzzy';

export class ParserTextNormalizer {
  static readonly STOP_WORDS = new Set(['the', 'prod']);

  static matchStrings(
    string1: string,
    string2: string,
    threshold = 0.9,
  ): MatchStringsResult {
    const normalizedA = this.normalizeString(string1);
    const normalizedB = this.normalizeString(string2);

    if (normalizedA === normalizedB) {
      return {
        matched: true,
        score: 1,
        normalizedA,
        normalizedB,
        jaroWinkler: 1,
        fuzzy: 1,
      };
    }

    const jaroWinklerResult = jaroWinkler(normalizedA, normalizedB);

    const fuzzyScore = fuzzy(normalizedA, normalizedB);

    const score = (jaroWinklerResult + fuzzyScore) / 2;

    return {
      matched: score >= threshold,
      score,
      normalizedA,
      normalizedB,
      jaroWinkler: jaroWinklerResult,
      fuzzy: fuzzyScore,
    };
  }

  static normalizeString(str: string): string {
    return str
      .normalize('NFKD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/\$/g, 's')
      .replace(/&/g, ' and ')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .filter((word) => !this.STOP_WORDS.has(word))
      .join(' ')
      .trim();
  }

  static FEATURE_REGEX =
    /\s*[\(\[\{]?\s*(?:feat\.?|ft\.?|featuring|with)\s+[^)\]}]+[\)\]\}]?/gi;
  static VERSION_REGEX =
    /\s*[\(\[\{]?\s*(?:extended|radio|club|dub|original|album|single|clean|explicit|instrumental|acapella|karaoke|demo|edit|mix|version)\b[^)\]}]*[\)\]\}]?/gi;
  static LIVE_REGEX =
    /\s*[\(\[\{]?\s*(?:live(?:\s+at|\s+from)?|unplugged|acoustic)\b[^)\]}]*[\)\]\}]?/gi;
  static REMASTER_REGEX =
    /\s*[\(\[\{]?\s*(?:\d{4}\s*)?(?:remaster(?:ed)?|digitally remastered)\b[^)\]}]*[\)\]\}]?/gi;
  static EDITION_REGEX =
    /\s*[\(\[\{]?\s*(?:deluxe|super deluxe|expanded|special edition|collector'?s edition|anniversary edition)\b[^)\]}]*[\)\]\}]?/gi;
  static NOISE_REGEX =
    /\b(?:official|audio|video|visualizer|lyric|lyrics|mv|m\/v|pv|teaser|preview|snippet|promo|full(?:\s+song)?|full\s+album|full\s+leak|leak|hq|hd|4k|8k|1080p|720p|reupload|re-upload|rip|bootleg|fan\s*made|fanmade|exclusive|uncensored|censored|clean|explicit)\b/gi;
  static EMPTY_BRACKETS_REGEX = /\(\s*\)|\[\s*\]|\{\s*\}/g;
  static SEPARATOR_REGEX = /^\s*[-–—:|]+\s*|\s*[-–—:|]+\s*$/g;
  static SPACES_REGEX = /\s+/g;

  static normalizeTrackNameString(str: string): string {
    return this.normalizeString(str)
      .replace(this.FEATURE_REGEX, '')
      .replace(this.LIVE_REGEX, '')
      .replace(this.REMASTER_REGEX, '')
      .replace(this.EDITION_REGEX, '')
      .replace(this.VERSION_REGEX, '')
      .replace(this.NOISE_REGEX, '')
      .replace(this.EMPTY_BRACKETS_REGEX, '')
      .replace(this.SEPARATOR_REGEX, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

export interface MatchStringsResult {
  matched: boolean;
  score: number;
  normalizedA: string;
  normalizedB: string;
  jaroWinkler: number;
  fuzzy: number;
}
