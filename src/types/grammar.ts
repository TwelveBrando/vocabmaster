export type GrammarLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export type GrammarExerciseType = 'multiple_choice' | 'fill_blank' | 'find_mistake';

export interface GrammarExercise {
  id: string;
  type: GrammarExerciseType;
  question: string; // The sentence with gap or with mistake
  prompt?: string; // e.g. "Раскройте скобки: I (to be) a student"
  options?: string[]; // For multiple_choice
  correctAnswer: string;
  acceptableAnswers?: string[]; // For fill_blank variations
  explanation: string;
  hint?: string;
}

export interface GrammarLecture {
  id: string;
  topicId: string;
  subtopicId: string;
  title: string;
  subtitle: string;
  readTimeMinutes: number;
  
  // Rich book/editorial content
  contentSections: {
    title?: string;
    paragraphs: string[];
    table?: {
      headers: string[];
      rows: string[][];
    };
    callout?: {
      type: 'note' | 'warning' | 'rule' | 'quote';
      title?: string;
      text: string;
    };
    examples?: {
      english: string;
      russian: string;
      note?: string;
    }[];
  }[];

  // 3 sets of 5 exercises (15 exercises total per lecture)
  exercises: {
    multipleChoice: GrammarExercise[]; // 5 items
    fillBlank: GrammarExercise[];       // 5 items
    findMistake: GrammarExercise[];     // 5 items
  };
}

export interface GrammarSubtopic {
  id: string;
  title: string;
  description: string;
  readTimeMinutes: number;
  exercisesCount: number;
  lectureId: string;
}

export interface GrammarTopic {
  id: string;
  level: GrammarLevel;
  number: number;
  title: string;
  titleRussian: string;
  description: string;
  iconName: string;
  badge: string;
  subtopics: GrammarSubtopic[];
}

export interface GrammarUserProgress {
  completedSubtopics: string[];
  passedExercises: Record<string, { 
    choiceScore?: number; 
    fillScore?: number; 
    findMistakeScore?: number; 
    totalScore: number; 
    maxPossible: number; 
    timestamp: number 
  }>;
  lastViewedSubtopicId?: string;
}
