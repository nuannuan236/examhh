import Dexie, { type Table } from 'dexie'
import type { Question, QuestionBank, AnswerRecord } from './types'
import { needsJudgementRepair, normalizeJudgementQuestion } from './questionNormalize'

class QuizDatabase extends Dexie {
  questions!: Table<Question, number>
  banks!: Table<QuestionBank, number>
  answers!: Table<AnswerRecord, number>

  constructor() {
    super('QuizAppDB')
    this.version(1).stores({
      questions: '++id, bankId, chapter, type',
      banks: '++id, name, createdAt',
      answers: '++id, questionId, bankId, isCorrect, answeredAt',
    })
  }
}

export const db = new QuizDatabase()

/** 将值转为纯对象，去除 Vue Proxy 等不可 structured-clone 的包装 */
function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

/** 保存题库和题目到 IndexedDB（同一事务，保证原子性） */
export async function saveBankToDB(
  bankName: string,
  fileName: string,
  questions: Omit<Question, 'id' | 'bankId'>[]
): Promise<number> {
  const plainQuestions = toPlain(questions)
  let bankId!: number

  await db.transaction('rw', db.banks, db.questions, async () => {
    bankId = await db.banks.add({
      name: bankName,
      fileName,
      createdAt: Date.now(),
      questionCount: plainQuestions.length,
    })

    const questionsWithBank: Question[] = plainQuestions.map((q) => ({
      ...q,
      bankId,
    }))

    await db.questions.bulkAdd(questionsWithBank)
  })

  return bankId
}

/** 获取所有题库 */
export async function getAllBanks(): Promise<QuestionBank[]> {
  return db.banks.orderBy('createdAt').reverse().toArray()
}

/** 根据多个ID获取题库 */
export async function getBanksByIds(bankIds: number[]): Promise<QuestionBank[]> {
  const banks = await db.banks.bulkGet(bankIds)
  return banks.filter((b): b is QuestionBank => b !== undefined)
}

/** 根据文件名获取题库，用于内置题库去重 */
export async function getBankByFileName(fileName: string): Promise<QuestionBank | undefined> {
  return db.banks.filter((bank) => bank.fileName === fileName).first()
}

/** 根据题库ID获取题目 */
export async function getQuestionsByBankId(bankId: number): Promise<Question[]> {
  const questions = await db.questions.where('bankId').equals(bankId).toArray()
  return questions.map((question) => normalizeJudgementQuestion(question))
}

/** 根据多个题库ID获取题目（混合考核） */
export async function getQuestionsByBankIds(bankIds: number[]): Promise<Question[]> {
  if (bankIds.length === 0) return []
  if (bankIds.length === 1) return getQuestionsByBankId(bankIds[0])
  const results = await Promise.all(bankIds.map((id) => getQuestionsByBankId(id)))
  return results.flat()
}

/** 保存答题记录 */
export async function saveAnswerRecord(
  questionId: number,
  bankId: number,
  userAnswer: string,
  isCorrect: boolean
): Promise<void> {
  await db.answers.add({
    questionId,
    bankId,
    userAnswer,
    isCorrect,
    answeredAt: Date.now(),
  })
}

/** 获取错题列表 */
export async function getWrongQuestions(bankId?: number): Promise<(Question & { userAnswer: string })[]> {
  let query = db.answers.where('isCorrect').equals(0)
  if (bankId !== undefined) {
    const records = await db.answers
      .where('bankId')
      .equals(bankId)
      .and((a) => !a.isCorrect)
      .toArray()
    const questionIds = [...new Set(records.map((r) => r.questionId))]
    const questions = await db.questions.bulkGet(questionIds)
    return questions
      .filter((q): q is Question => q !== undefined)
      .map((q) => normalizeJudgementQuestion(q))
      .map((q) => {
        const record = records.find((r) => r.questionId === q.id)
        return { ...q, userAnswer: record?.userAnswer || '' }
      })
  }

  const records = await query.toArray()
  const questionIds = [...new Set(records.map((r) => r.questionId))]
  const questions = await db.questions.bulkGet(questionIds)
  return questions
    .filter((q): q is Question => q !== undefined)
    .map((q) => normalizeJudgementQuestion(q))
    .map((q) => {
      const record = records.find((r) => r.questionId === q.id)
      return { ...q, userAnswer: record?.userAnswer || '' }
    })
}

/** 获取统计数据 */
export async function getStats(bankId?: number) {
  const answers = bankId
    ? await db.answers.where('bankId').equals(bankId).toArray()
    : await db.answers.toArray()

  const total = answers.length
  const correct = answers.filter((a) => a.isCorrect).length
  const wrong = total - correct
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0

  const questionIds = [...new Set(answers.map((a) => a.questionId))]
  const totalQuestions = bankId
    ? await db.questions.where('bankId').equals(bankId).count()
    : await db.questions.count()

  return {
    totalAnswers: total,
    correctCount: correct,
    wrongCount: wrong,
    accuracy,
    answeredQuestions: questionIds.length,
    totalQuestions,
    progress: totalQuestions > 0 ? Math.round((questionIds.length / totalQuestions) * 100) : 0,
  }
}

/** 删除题库及其所有题目和答题记录 */
export async function deleteBank(bankId: number): Promise<void> {
  await db.transaction('rw', db.banks, db.questions, db.answers, async () => {
    await db.banks.delete(bankId)
    await db.questions.where('bankId').equals(bankId).delete()
    await db.answers.where('bankId').equals(bankId).delete()
  })
}

/** 清空所有数据 */
export async function clearAllData(): Promise<void> {
  await db.transaction('rw', db.banks, db.questions, db.answers, async () => {
    await db.banks.clear()
    await db.questions.clear()
    await db.answers.clear()
  })
}

/** 修复旧缓存中无选项的判断题，不删除题库或答题记录 */
export async function repairJudgementQuestions(): Promise<number> {
  const questions = await db.questions.toArray()
  const repairs = questions
    .filter((question) => question.id !== undefined && needsJudgementRepair(question))
    .map((question) => {
      const normalized = normalizeJudgementQuestion(question)
      return {
        id: question.id!,
        changes: {
          answer: normalized.answer,
          options: normalized.options,
        },
      }
    })

  if (repairs.length === 0) return 0

  await db.transaction('rw', db.questions, async () => {
    for (const repair of repairs) {
      await db.questions.update(repair.id, repair.changes)
    }
  })

  return repairs.length
}

/** 导出题库为JSON */
export async function exportBank(bankId: number): Promise<string> {
  const bank = await db.banks.get(bankId)
  const questions = await getQuestionsByBankId(bankId)
  return JSON.stringify({ bank, questions }, null, 2)
}
