import * as XLSX from 'xlsx'
import type { ImportPreview, Question } from './types'
import { normalizeJudgementQuestion } from './questionNormalize'

/** 标准列名映射：别名 → 标准字段 */
const COLUMN_ALIASES: Record<string, keyof Question> = {
  // 题目
  '题目': 'content',
  '题目内容': 'content',
  '题干内容': 'content',
  'question': 'content',
  '题干': 'content',
  '标题': 'content',
  'content': 'content',
  'title': 'content',
  '问题': 'content',
  // 选项
  'a': 'options',
  'b': 'options',
  'c': 'options',
  'd': 'options',
  'e': 'options',
  'f': 'options',
  '选项a': 'options',
  '选项b': 'options',
  '选项c': 'options',
  '选项d': 'options',
  '选项e': 'options',
  '选项f': 'options',
  // 答案
  '答案': 'answer',
  'answer': 'answer',
  '正确答案': 'answer',
  'correct': 'answer',
  'correctanswer': 'answer',
  '正确选项': 'answer',
  // 解析
  '解析': 'explanation',
  'analysis': 'explanation',
  '解释': 'explanation',
  '说明': 'explanation',
  'explanation': 'explanation',
  // 章节
  '章节': 'chapter',
  'chapter': 'chapter',
  '章': 'chapter',
  '节': 'chapter',
  // 题型
  '题型': 'type',
  'type': 'type',
  '类型': 'type',
  '题目类型': 'type',
}

/** 选项字母列的别名模式 */
const OPTION_LETTER_PATTERNS = [
  /^([a-f])$/i,
  /^选项([a-f])$/i,
  /^option[_\s]*([a-f])$/i,
]

function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/[\s_]+/g, '')
}

function detectOptionLetter(rawKey: string): string | null {
  const normalized = rawKey.trim().toLowerCase()
  for (const pattern of OPTION_LETTER_PATTERNS) {
    const match = normalized.match(pattern)
    if (match) return match[1].toUpperCase()
  }
  return null
}

function parseAnswer(raw: string): string {
  if (!raw) return ''
  const cleaned = raw.trim().toUpperCase().replace(/[\s,，、;；]+/g, '')
  // 验证只包含 A-F
  if (/^[A-F]+$/.test(cleaned)) {
    return cleaned.split('').sort().join('')
  }
  return cleaned
}

/**
 * 解析 Excel 文件，返回导入预览
 */
export function parseXlsxFile(file: File): Promise<ImportPreview> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' })

        if (rows.length === 0) {
          resolve({
            fileName: file.name,
            totalRows: 0,
            parsedCount: 0,
            skippedCount: 0,
            questions: [],
            errors: ['文件为空或无法解析'],
          })
          return
        }

        // 分析列名
        const rawHeaders = Object.keys(rows[0])
        const columnMap = new Map<string, { field: string; letter?: string }>()

        for (const header of rawHeaders) {
          const letter = detectOptionLetter(header)
          if (letter) {
            columnMap.set(header, { field: 'options', letter })
            continue
          }
          const normalized = normalizeKey(header)
          const alias = COLUMN_ALIASES[normalized]
          if (alias) {
            columnMap.set(header, { field: alias })
          }
        }

        // 解析每一行
        const questions: Question[] = []
        let skippedCount = 0
        const errors: string[] = []

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i]
          let content = ''
          let answer = ''
          let explanation = ''
          let chapter = ''
          let type = ''
          const options: Record<string, string> = {}

          for (const [header, mapping] of columnMap) {
            const value = String(row[header] || '').trim()
            if (!value) continue

            if (mapping.field === 'content') {
              content = value
            } else if (mapping.field === 'options' && mapping.letter) {
              options[mapping.letter] = value
            } else if (mapping.field === 'answer') {
              answer = value
            } else if (mapping.field === 'explanation') {
              explanation = value
            } else if (mapping.field === 'chapter') {
              chapter = value
            } else if (mapping.field === 'type') {
              type = value
            }
          }

          // 验证：至少需要题目和答案
          if (!content || !answer) {
            skippedCount++
            if (errors.length < 5) {
              errors.push(`第 ${i + 2} 行：${!content ? '缺少题目' : '缺少答案'}`)
            }
            continue
          }

          const parsedAnswer = parseAnswer(answer)
          if (!parsedAnswer) {
            skippedCount++
            if (errors.length < 5) {
              errors.push(`第 ${i + 2} 行：答案格式无法识别 "${answer}"`)
            }
            continue
          }

          questions.push(normalizeJudgementQuestion({
            bankId: 0, // 会在保存时设置
            content,
            options,
            answer: parsedAnswer,
            explanation: explanation || undefined,
            chapter: chapter || undefined,
            type: type || undefined,
          }))
        }

        resolve({
          fileName: file.name,
          totalRows: rows.length,
          parsedCount: questions.length,
          skippedCount,
          questions,
          errors,
        })
      } catch (err) {
        reject(new Error(`解析失败: ${(err as Error).message}`))
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })
}
