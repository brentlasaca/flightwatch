/** Google Flights supported language codes (BCP-47 / hl parameter). */

export interface Language {
  code: string;
  name: string;
}

export const LANGUAGES: Language[] = [
  { code: 'ar',    name: 'Arabic' },
  { code: 'bg',    name: 'Bulgarian' },
  { code: 'ca',    name: 'Catalan' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)' },
  { code: 'hr',    name: 'Croatian' },
  { code: 'cs',    name: 'Czech' },
  { code: 'da',    name: 'Danish' },
  { code: 'nl',    name: 'Dutch' },
  { code: 'en',    name: 'English' },
  { code: 'et',    name: 'Estonian' },
  { code: 'fi',    name: 'Finnish' },
  { code: 'fr',    name: 'French' },
  { code: 'de',    name: 'German' },
  { code: 'el',    name: 'Greek' },
  { code: 'he',    name: 'Hebrew' },
  { code: 'hi',    name: 'Hindi' },
  { code: 'hu',    name: 'Hungarian' },
  { code: 'id',    name: 'Indonesian' },
  { code: 'it',    name: 'Italian' },
  { code: 'ja',    name: 'Japanese' },
  { code: 'ko',    name: 'Korean' },
  { code: 'lv',    name: 'Latvian' },
  { code: 'lt',    name: 'Lithuanian' },
  { code: 'ms',    name: 'Malay' },
  { code: 'no',    name: 'Norwegian' },
  { code: 'pl',    name: 'Polish' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)' },
  { code: 'pt-PT', name: 'Portuguese (Portugal)' },
  { code: 'ro',    name: 'Romanian' },
  { code: 'ru',    name: 'Russian' },
  { code: 'sr',    name: 'Serbian' },
  { code: 'sk',    name: 'Slovak' },
  { code: 'sl',    name: 'Slovenian' },
  { code: 'es',    name: 'Spanish' },
  { code: 'sv',    name: 'Swedish' },
  { code: 'tl',    name: 'Filipino' },
  { code: 'th',    name: 'Thai' },
  { code: 'tr',    name: 'Turkish' },
  { code: 'uk',    name: 'Ukrainian' },
  { code: 'vi',    name: 'Vietnamese' },
];

/** Get a language's display name by BCP-47 code, falling back to the code itself. */
export function getLanguageName(code: string): string {
  return LANGUAGES.find(l => l.code === code)?.name ?? code;
}
