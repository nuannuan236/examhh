export interface BundledBank {
  fileName: string
  url: string
}

const baseUrl = import.meta.env.BASE_URL

function bankUrl(fileName: string): string {
  return `${baseUrl}question-banks/${encodeURIComponent(fileName)}`
}

export const BUNDLED_BANKS: BundledBank[] = [
  '第1章 常用低压控制器件测试.xlsx',
  '第2章电气控制线路基础测试.xlsx',
  '第3章 S7-1200 PLC基础.xlsx',
  '第4章S7-1200基本指令及程序设计测试.xlsx',
  '第5章 S7-1200扩展及工艺指令测试.xlsx',
  '第6章 S7-1200 PLC编程设计测试.xlsx',
  '第7章 S7-1200 通信测试.xlsx',
  '第8章PLC控制系统综合设计.xlsx',
].map((fileName) => ({
  fileName,
  url: bankUrl(fileName),
}))
