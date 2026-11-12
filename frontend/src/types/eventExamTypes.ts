export type ExamQuestionType = 'MULTIPLE_CHOICE' | 'MULTI_SELECT' | 'FILL_IN_BLANK' | 'TFNG' | 'YNNG';

export interface PassageData {
  id: number; // 1, 2, 3
  title: string;
  instruction?: string;
  imageUrl?: string;
  content: string;
}

export interface StructuredPassagePayload {
  passages: PassageData[];
}

export interface StructuredQuestionPayload {
  prompt: string;
  type: ExamQuestionType;
  imageUrl?: string;
  options?: Record<string, string>;
  optionLetters?: string[];
  groupId?: string;
  groupStart?: number;
  groupEnd?: number;
}

export const DEFAULT_PASSAGES: PassageData[] = [
  {
    id: 1,
    title: 'Passage 1',
    instruction: 'You should spend about 20 minutes on Questions 1-13, which are based on Passage 1.',
    imageUrl: '',
    content: '',
  },
  {
    id: 2,
    title: 'Passage 2',
    instruction: 'You should spend about 20 minutes on Questions 14-26, which are based on Passage 2.',
    imageUrl: '',
    content: '',
  },
  {
    id: 3,
    title: 'Passage 3',
    instruction: 'You should spend about 20 minutes on Questions 27-40, which are based on Passage 3.',
    imageUrl: '',
    content: '',
  },
  {
    id: 4,
    title: 'Part 4',
    instruction: 'Questions 31-40.',
    imageUrl: '',
    content: '',
  },
];

export const parsePassageData = (rawText?: string): PassageData[] => {
  if (!rawText || !rawText.trim()) {
    return DEFAULT_PASSAGES;
  }
  try {
    const trimmed = rawText.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed.passages) && parsed.passages.length > 0) {
        return parsed.passages.map((p: any, idx: number) => {
          const num = Number(p.id) || idx + 1;
          const def = DEFAULT_PASSAGES[num - 1] || {
            id: num,
            title: `Part / Passage ${num}`,
            instruction: '',
            imageUrl: '',
            content: '',
          };
          return {
            id: num,
            title: p.title || def.title,
            instruction: p.instruction !== undefined ? p.instruction : def.instruction,
            content: p.content || '',
            imageUrl: p.imageUrl || '',
          };
        });
      }
    }
  } catch (e) {
    // If not JSON, fall back to plain legacy text in Passage 1
  }

  return [
    {
      id: 1,
      title: 'Passage 1',
      instruction: DEFAULT_PASSAGES[0].instruction,
      content: rawText,
      imageUrl: '',
    },
    DEFAULT_PASSAGES[1],
    DEFAULT_PASSAGES[2],
    DEFAULT_PASSAGES[3],
  ];
};

export const serializePassageData = (passages: PassageData[]): string => {
  return JSON.stringify({ passages });
};

export const parseQuestionData = (rawText?: string): StructuredQuestionPayload => {
  if (!rawText || !rawText.trim()) {
    return {
      prompt: '',
      type: 'FILL_IN_BLANK',
      imageUrl: '',
      options: { A: '', B: '', C: '', D: '' },
    };
  }
  try {
    const trimmed = rawText.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const parsed = JSON.parse(trimmed);
      if (parsed.prompt !== undefined || parsed.type !== undefined) {
        return {
          prompt: parsed.prompt || '',
          type: (parsed.type as ExamQuestionType) || 'FILL_IN_BLANK',
          imageUrl: parsed.imageUrl || '',
          options: parsed.options || { A: '', B: '', C: '', D: '' },
          optionLetters: Array.isArray(parsed.optionLetters) ? parsed.optionLetters : undefined,
          groupId: parsed.groupId || undefined,
          groupStart: parsed.groupStart ? Number(parsed.groupStart) : undefined,
          groupEnd: parsed.groupEnd ? Number(parsed.groupEnd) : undefined,
        };
      }
    }
  } catch (e) {
    // Fall back to plain legacy text
  }

  return {
    prompt: rawText,
    type: 'FILL_IN_BLANK',
    imageUrl: '',
    options: { A: '', B: '', C: '', D: '' },
  };
};

export const serializeQuestionData = (data: StructuredQuestionPayload): string => {
  const payload: Record<string, any> = {
    prompt: data.prompt || '',
    type: data.type || 'FILL_IN_BLANK',
    imageUrl: data.imageUrl || '',
  };

  if (data.type === 'MULTIPLE_CHOICE' || data.type === 'MULTI_SELECT') {
    payload.options = data.options;
  }
  if (data.optionLetters && data.optionLetters.length > 0) {
    payload.optionLetters = data.optionLetters;
  }
  if (data.groupId) {
    payload.groupId = data.groupId;
  }
  if (data.groupStart !== undefined) {
    payload.groupStart = data.groupStart;
  }
  if (data.groupEnd !== undefined) {
    payload.groupEnd = data.groupEnd;
  }

  return JSON.stringify(payload);
};
