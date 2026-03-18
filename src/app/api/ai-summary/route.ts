import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY가 설정되지 않았습니다. .env.local에 추가하세요.' }, { status: 500 })
  }

  const { text } = await req.json()
  if (!text?.trim()) {
    return NextResponse.json({ error: '요약할 텍스트가 없습니다.' }, { status: 400 })
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `다음 노트 내용을 한국어로 3~5줄 핵심 요약해줘. 불릿 포인트 없이 자연스러운 문장으로 작성해:\n\n${text.slice(0, 4000)}`,
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 512,
          temperature: 0.5,
        },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return NextResponse.json({ error: err.error?.message || 'Gemini API 오류' }, { status: res.status })
  }

  const data = await res.json()
  const summary = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  return NextResponse.json({ summary })
}
