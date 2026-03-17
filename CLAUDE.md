# Note-Archive 프로젝트

## 기술 스택
- Framework: Next.js 14 (App Router)
- Database: Supabase (PostgreSQL JSONB)
- Styling: Tailwind CSS
- Language: TypeScript
- 배포: Vercel (예정)
- 프로젝트 경로: C:\Users\LJG\Desktop\note-archive

## Supabase 설정
- URL: https://tejhpzltljxwvtlmrsxi.supabase.co
- Anon Key: sb_publishable_M7mnOfsG_kJRy9tiswr6WA_lEHQUnNn

## 프로젝트 개요
개인 공부 필기를 저장하고 보기 위한 웹사이트.
개발자 혼자 사용하는 개인 필기 아카이브.

---

## 디자인 방향
- 글라스모피즘(Glassmorphism) UI — backdrop-filter blur, rgba 배경
- 전체 하늘색(sky) 테마, dark: 클래스 사용하지 않음
- 깔끔한 카드 레이아웃, 카드 호버 애니메이션
- 그라데이션 포인트 컬러
- glass-card / glass-header / glass-panel CSS 클래스 사용

---

## 메인 페이지 (`src/app/page.tsx`)
- 등록된 노트 카드 형태로 표시 (아이콘, 타이틀, 설명, 태그, 잠금 아이콘)
- 새 노트 추가 버튼
- 카드 클릭 → 노트 상세 이동 (잠금 노트는 비밀번호 모달 먼저)
- 일반 / 잠금 노트 탭 분류
- 삭제 시 잠금 노트는 비밀번호 확인 후 ConfirmDialog → soft delete
- 휴지통 버튼 → TrashModal
- 노트 fetch 시 `.is('deleted_at', null)` 필터 (컬럼 없을 경우 fallback 처리)
- 대시보드 상단: 글라스 패널 + 히어로 + 검색 + 통계 인라인 레이아웃
- 새 노트 생성 후 `router.refresh()` → `router.push('/')` (캐시 무효화)

---

## 노트 등록 페이지 (`src/app/notes/new/page.tsx`)
- 아이콘 선택 (이모지 팔레트)
- 타이틀, 설명, 태그 입력
- 암호 설정 체크박스 (체크 시 비밀번호 입력창 활성화, bcrypt 해시 저장)
- 저장 후 `router.refresh()` → `router.push('/')` 순서로 호출

---

## 노트 상세 페이지 (`src/app/notes/[id]/page.tsx`)

### 편집 모드
- 상단 "편집" 버튼 클릭 → 편집 모드 진입
- **완료 버튼 클릭 시 일괄 DB 저장** (실시간 저장 아님)
- 저장 패턴: `pendingChanges = useRef<Record<string, Record<string, unknown>>>({})` 사용
  - 블록 내용 변경 → `pendingChanges.current[blockId] = content` (ref에만 저장, 리렌더링 없음)
  - 블록 타이틀 변경 → `pendingTitles.current[blockId] = title` (로컬 display도 업데이트)
  - 완료 클릭 → `handleComplete()` → 모든 pending을 DB에 일괄 저장
- **주의**: `handleComplete()`에서 반드시 `changes = { ...pendingChanges.current }` 로 **먼저 복사 후** 사용할 것
  - `setBlocks(updater)` 는 비동기 실행이므로, 그전에 ref를 `{}` 로 비우면 updater 실행 시 이미 빈 상태
  - 복사한 `changes` 로컬 변수를 사용해야 함

### 탭
- 탭 추가 / 삭제 / 이름 변경 (더블클릭으로 이름 편집)
- 탭 바: `rgba(255,255,255,0.6)` 글라스 배경, 활성 탭 `bg-sky-500/20`

### 블록 공통
- 타이틀 토글 (기본 미사용)
- 편집 / 미리보기 토글 (블록별)
- 위/아래 이동, 삭제(확인 포함)
- **모든 블록 컴포넌트는 내부 useState로 자체 상태 관리** (Korean IME 이슈 방지)
  - props `content` 변경 시 `useEffect`로 내부 state 동기화
  - onChange 호출로 부모의 `pendingChanges` ref 업데이트 (부모 리렌더링 없음)

### 블록 종류 10가지

**기존 7가지:**
1. **텍스트** (`text`) — Markdown, react-markdown 렌더링
2. **코드** (`code`) — 구문 강조, 복사 버튼
3. **팁** (`tip`) — 아이콘 + 불릿 리스트
4. **단계** (`steps`) — 번호 + 설명 + 코드
5. **테이블** (`table`) — 동적 행/열
6. **체크리스트** (`checklist`) — 항목별 체크 + 진행률
7. **파일** (`file`) — 파일 업로드, 미리보기, 다운로드
   - 이미지: `<img>` 태그
   - PDF: `data:` URL → Blob URL 변환 후 `<iframe>` (브라우저 data: URL 차단 우회)
   - 텍스트류: `atob()` → `TextDecoder('utf-8')` 로 Korean 깨짐 방지
   - 중복 업로드 방지: FileReader를 `setLocalFiles` updater 밖에서 생성 (React StrictMode 이중 호출 방지)

**추가 3가지:**
8. **키워드** (`keyword`) — 번호 배지 + 아이콘 + 키워드 제목 — 부제목 + 코드 스타일 예시 블록
9. **흐름도** (`flow`) — 가로 단계 다이어그램, 화살표 연결, 활성 단계 하이라이트
10. **기능 목록** (`featurelist`) — 원형 아이콘 + 컬러 레이블(N번째) + 굵은 제목 + 설명

### 블록 선택 모달
- 7개 초과 시 페이징 처리 (현재 10개 → 1페이지 7개, 2페이지 3개)
- 이전/다음 버튼 + 점 인디케이터
- **호버 미리보기**: 블록 항목에 마우스 올리면 우측 패널에 실제 컴포넌트를 샘플 데이터로 렌더링
  - 모달 너비 440px → 800px 으로 자연스럽게 확장 (CSS transition)
  - `BLOCK_PREVIEW_SAMPLES` 상수에 각 블록별 샘플 데이터 정의

---

## 휴지통 (`src/components/TrashModal.tsx`)
- 삭제 = soft delete (`deleted_at` 컬럼에 현재 시각 저장)
- 복구: `update({ deleted_at: null })`
- 영구 삭제: `delete()` (인라인 확인 모달)
- 휴지통 비우기: 전체 `delete()` 일괄
- 스타일: `rgba(255,255,255,0.92)` 글라스, `maxHeight: 85vh`, 스크롤 가능

---

## 비밀번호 모달 (`src/components/PasswordModal.tsx`)
- `confirmLabel?: string` prop (기본값 `'열기'`)
- 노트 열기, 삭제 확인 등 다용도 사용

---

## Supabase DB 스키마 (`supabase/schema.sql`)

### notes 테이블
```sql
id, icon, title, description, tags TEXT[],
is_locked BOOLEAN, password_hash TEXT, user_id UUID,
deleted_at TIMESTAMPTZ DEFAULT NULL,  -- soft delete
created_at, updated_at TIMESTAMPTZ
```

### tabs 테이블
```sql
id, note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
name TEXT, order_index INTEGER, created_at
```

### blocks 테이블
```sql
id, tab_id UUID REFERENCES tabs(id) ON DELETE CASCADE,
type TEXT CHECK (type IN ('text','code','tip','steps','table','checklist','file','keyword','flow','featurelist')),
title TEXT, show_title BOOLEAN DEFAULT FALSE,
content JSONB DEFAULT '{}',
order_index INTEGER, created_at, updated_at
```

### 마이그레이션 (기존 DB에 추가)
```sql
ALTER TABLE notes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE blocks DROP CONSTRAINT IF EXISTS blocks_type_check;
ALTER TABLE blocks ADD CONSTRAINT blocks_type_check
  CHECK (type IN ('text','code','tip','steps','table','checklist','file','keyword','flow','featurelist'));
```

---

## 파일 구조

```
src/
├── app/
│   ├── page.tsx                    # 메인 대시보드
│   ├── notes/
│   │   ├── new/page.tsx            # 노트 생성
│   │   └── [id]/page.tsx           # 노트 상세 (블록 편집)
├── components/
│   ├── blocks/
│   │   ├── TextBlock.tsx
│   │   ├── CodeBlock.tsx
│   │   ├── TipBlock.tsx
│   │   ├── StepsBlock.tsx
│   │   ├── TableBlock.tsx
│   │   ├── ChecklistBlock.tsx
│   │   ├── FileBlock.tsx
│   │   ├── KeywordBlock.tsx        # 추가
│   │   ├── FlowBlock.tsx           # 추가
│   │   └── FeatureListBlock.tsx    # 추가
│   ├── ui/
│   │   └── Toast.tsx
│   ├── PasswordModal.tsx
│   └── TrashModal.tsx
└── lib/
    └── supabase.ts                 # 클라이언트 + 전체 타입 정의
supabase/
└── schema.sql
```

---

## 기타 요구사항
- 로컬에서 `npm run dev` 로 바로 실행 가능
- `.env.local` 에 Supabase 환경변수 설정
- dark: 클래스 사용 금지 (하늘색 단일 테마)
- 모든 블록 컴포넌트는 내부 state 패턴 사용 (Korean IME 이슈)
- 저장은 반드시 완료 버튼 일괄 저장 방식 유지

## 문서 파일
- `README.md` — 프로젝트 설명, 기술 스택, 로컬 실행 방법, 배포 방법
- `.env.example` — 환경변수 형식 (키값 제외)
- `supabase/schema.sql` — DB 테이블 구조 전체 + 마이그레이션
- `CHANGELOG.md` — 버전 기록 (v0.1.0)
