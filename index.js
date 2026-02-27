import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { z } from 'zod'

const app = new Hono()

// 1. 定义 Zod 基础结构与初步校验
const containerSchema = z.object({
  containerNo: z.string()
    .length(11, '箱号必须严格为 11 位')
    .regex(/^[A-Z]{4}\d{7}$/, '前4位必须是纯大写字母，后7位必须是数字')
})

// 2. 核心加权算法
function checkCnTrNo(value) {
  if (!value || value.length !== 11) return false
  const getNumber = new Map()
  let num = 10
  for (let i = 0; i < 26; i++) {
    const word = String.fromCharCode(65 + i)
    if (num === 11 || num === 22 || num === 33) num += 1
    getNumber.set(word, num)
    num += 1
  }
  let sum = 0
  for (let i = 0; i < 4; i++) {
    const charValue = getNumber.get(value[i])
    if (charValue === undefined) return false
    sum += charValue * 2 ** i
  }
  for (let i = 4; i < 10; i++) {
    const digit = Number(value[i])
    if (Number.isNaN(digit)) return false
    sum += digit * 2 ** i
  }
  return (sum % 11 % 10) === Number(value[10])
}

// 3. 定义 POST 接口
app.post('/validate', async (c) => {
  try {
    const body = await c.req.json()
    
    // 第一道防线：Zod 拦截格式错误
    const result = containerSchema.safeParse(body)
    if (!result.success) {
      return c.json({ success: false, error: result.error.format() }, 400)
    }

    // 第二道防线：ISO 算法拦截无效箱号
    const isValid = checkCnTrNo(body.containerNo)
    if (!isValid) {
      return c.json({ success: false, message: `箱号 ${body.containerNo} 校验码计算不匹配` }, 400)
    }

    // 通关放行
    return c.json({
      success: true,
      message: `箱号 ${body.containerNo} 校验通过！`,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return c.json({ success: false, error: '请求体必须是合法的 JSON' }, 400)
  }
})

console.log('Server is running on port 3000')
serve({ fetch: app.fetch, port: 3000 })