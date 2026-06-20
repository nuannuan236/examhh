import type { Question } from './types'

type StoredQuestion = Question | Omit<Question, 'id' | 'bankId'>

const TRUE_ANSWERS = new Set(['正确', '對', '对', '是', 'TRUE', 'T', 'YES', 'Y', '1', '√', '✓'])
const FALSE_ANSWERS = new Set(['错误', '錯誤', '错', '否', 'FALSE', 'F', 'NO', 'N', '0', '×', '✕', 'X'])

export function isJudgementQuestion(type?: string): boolean {
  return Boolean(type?.includes('判断'))
}

function compactAnswer(answer: string): string {
  return answer.trim().replace(/[\s,，、;；。\.]+/g, '').toUpperCase()
}

export function normalizeJudgementAnswer(answer: string): string {
  const compacted = compactAnswer(answer)
  if (TRUE_ANSWERS.has(compacted)) return 'A'
  if (FALSE_ANSWERS.has(compacted)) return 'B'
  return answer
}

function hasOptions(options: Record<string, string>): boolean {
  return Object.values(options).some((value) => String(value).trim() !== '')
}

export function normalizeJudgementQuestion<T extends StoredQuestion>(question: T): T {
  if (!isJudgementQuestion(question.type)) return question

  const answer = normalizeJudgementAnswer(question.answer)
  const options = hasOptions(question.options)
    ? question.options
    : { A: '正确', B: '错误' }

  if (answer === question.answer && options === question.options) return question
  return {
    ...question,
    answer,
    options,
  }
}

export function needsJudgementRepair(question: Question): boolean {
  if (!isJudgementQuestion(question.type)) return false
  const normalized = normalizeJudgementQuestion(question)
  return normalized.answer !== question.answer || normalized.options !== question.options
}
