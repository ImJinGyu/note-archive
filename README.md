# Note Archive

개발자 개인 공부 필기를 저장하고 보는 웹 아카이브.

## 기술 스택

| 분류 | 기술 |
|------|------|
| Framework | Next.js 14 (App Router) |
| Database | Supabase (PostgreSQL) |
| Styling | Tailwind CSS |
| Language | TypeScript |
| 배포 | Vercel (예정) |

## 주요 기능

- 노트 생성 / 조회 / 삭제 (휴지통 → 복구 / 영구 삭제)
- 노트별 탭 구성 (추가 / 삭제 / 이름 변경)
- 10가지 블록 유형: 텍스트, 코드, 팁, 단계, 테이블, 체크리스트, 파일, 키워드, 흐름도, 기능 목록
- 블록 미리보기 / 순서 변경
- 노트 잠금 (bcrypt 비밀번호)
- 글라스모피즘 UI (하늘색 테마)

## 로컬 실행

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.example .env.local
# .env.local 에 Supabase URL / Anon Key 입력

# 3. Supabase DB 초기화
# supabase/schema.sql 내용을 Supabase SQL 에디터에서 실행

# 4. 개발 서버 시작
npm run dev
```

브라우저에서 http://localhost:3000 접속

## 환경변수

| 변수명 | 설명 |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key |

## 프로젝트 구조

```
src/
├── app/
│   ├── page.tsx              # 메인 대시보드
│   ├── notes/
│   │   ├── new/page.tsx      # 노트 생성
│   │   └── [id]/page.tsx     # 노트 상세
├── components/
│   ├── blocks/               # 블록 컴포넌트 (10종)
│   ├── ui/                   # 공통 UI (Toast 등)
│   ├── PasswordModal.tsx     # 비밀번호 모달
│   └── TrashModal.tsx        # 휴지통 모달
└── lib/
    └── supabase.ts           # Supabase 클라이언트 & 타입
supabase/
└── schema.sql                # DB 테이블 전체 스키마
```

## 배포 (Vercel)

```bash
# Vercel CLI
npx vercel

# 환경변수를 Vercel 대시보드에서 설정:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
```
