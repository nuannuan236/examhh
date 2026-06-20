/** 题目数据结构 */
export interface Question {
  id?: number
  bankId: number
  content: string
  options: Record<string, string>
  answer: string
  explanation?: string
  chapter?: string
  type?: string
}

/** 题库数据结构 */
export interface QuestionBank {
  id?: number
  name: string
  fileName: string
  createdAt: number
  questionCount: number
}

/** 用户答题记录 */
export interface AnswerRecord {
  id?: number
  questionId: number
  bankId: number
  userAnswer: string
  isCorrect: boolean
  answeredAt: number
}

/** 导入预览结果 */
export interface ImportPreview {
  fileName: string
  totalRows: number
  parsedCount: number
  skippedCount: number
  questions: Question[]
  errors: string[]
}

/** 答题模式 */
export type QuizMode = 'sequential' | 'random'

/** 答题状态 */
export interface QuizState {
  bankIds: number[]
  sourceLabel: string
  mode: QuizMode
  questions: Question[]
  currentIndex: number
  answers: Map<number, string>
  showResult: boolean
  finished: boolean
  isMixed: boolean
}
