# Note Archive — 아키텍처 및 계획서

> 버전 0.2.0 기준 | 최종 수정: 2026-03-18

---

## 목차

1. [전체 기능 목록](#1-전체-기능-목록)
2. [기술 스택](#2-기술-스택)
3. [파일 구조](#3-파일-구조)
4. [DB 스키마](#4-db-스키마)
5. [상태 관리 패턴](#5-상태-관리-패턴)
6. [컴포넌트 구조](#6-컴포넌트-구조)
7. [API 라우트](#7-api-라우트)
8. [데이터 흐름](#8-데이터-흐름)

---

## 1. 전체 기능 목록

### 코어 기능 (v0.1.0)

| # | 기능 | 설명 |
|---|------|------|
| 1 | 노트 CRUD | 생성, 조회, 편집, 소프트 삭제 |
| 2 | 탭 관리 | 탭 추가/삭제/이름변경/순서변경 |
| 3 | 블록 편집 | 블록 추가/편집/삭제/순서변경 |
| 4 | 잠금 노트 | bcrypt 비밀번호 보호 |
| 5 | 검색 | 제목/설명/태그 검색 |
| 6 | 휴지통 | 소프트 삭제, 복구, 영구 삭제 |
| 7 | 내보내기 | 마크다운 파일 다운로드 |
| 8 | 인증 | Supabase Auth (이메일/비밀번호) |
| 9 | 태그 | 노트 태그 지정 및 필터링 |
| 10 | 블록 13종 | text, code, tip, steps, table, checklist, file, keyword, flow, featurelist, keyvalue, list (+ credential) |

### 확장 기능 (v0.2.0)

| # | 기능 | 설명 |
|---|------|------|
| 11 | 드래그앤드롭 | @dnd-kit 기반 블록 순서 변경 |
| 12 | 잠금 세션 유지 | sessionStorage 기반 세션 내 잠금 해제 유지 |
| 13 | 슬래시 커맨드 | `/` 입력으로 블록 빠른 추가 |
| 14 | 최근 본 노트 | localStorage 기반 히스토리 |
| 15 | 핀 고정 | 즐겨찾기 노트 상단 고정 |
| 16 | 노트 복제 | 탭/블록 포함 전체 복사 |
| 17 | 노트 병합 | 다른 노트의 탭/블록을 현재 노트에 합치기 |
| 18 | 댓글 | 노트별 코멘트 (note_comments 테이블) |
| 19 | 변경 이력 | 변경 사유 기록 (note_history 테이블) |
| 20 | QR 공유 | qrcode 라이브러리로 노트 URL QR 생성 |
| 21 | 잔디 그래프 | 날짜별 작성 활동 시각화 |
| 22 | 블록 통계 | 블록 타입별 사용 통계 차트 |
| 23 | 주간 목표 | 주간 노트 작성 목표 설정 |
| 24 | 태그 필터 뷰 | 전체 태그 목록 + 클릭 필터 |
| 25 | 오프라인 배너 | 네트워크 상태 감지 알림 |
| 26 | 다크 모드 | CSS 커스텀 프로퍼티 기반 테마 전환 |
| 27 | 블록 이동 | 다른 탭/노트로 블록 이전 |
| 28 | AI 요약 | Claude Haiku 기반 노트 요약 |
| 29 | 캘린더 | 날짜별 노트 뷰 |
| 30 | 폴더/워크스페이스 | 노트 그룹핑 (FolderModal) |
| 31 | 배경 선택 | 노트 배경 커스터마이징 |
| 32 | 계정 삭제 | 사용자 계정 완전 삭제 API |
| 33 | IP 차단 | blocked_ips 테이블 기반 미들웨어 |

### 블록 타입 전체 목록 (22종)

| 카테고리 | 블록 타입 | 파일 |
|----------|-----------|------|
| 기본 텍스트 | text, list | TextBlock.tsx, ListBlock.tsx |
| 코드/기술 | code, keyword, keyvalue | CodeBlock.tsx, KeywordBlock.tsx, KeyValueBlock.tsx |
| 구조화 | steps, flow, featurelist, table | StepsBlock.tsx, FlowBlock.tsx, FeatureListBlock.tsx, TableBlock.tsx |
| 체크/평가 | checklist, poll | ChecklistBlock.tsx, PollBlock.tsx |
| 시각화 | mindmap, image, embed, math | MindmapBlock.tsx, ImageBlock.tsx, EmbedBlock.tsx, MathBlock.tsx |
| 정보/참고 | tip, link, file, license, credential | TipBlock.tsx, LinkBlock.tsx, FileBlock.tsx, LicenseBlock.tsx, CredentialBlock.tsx |
| 도구 | timer, ai_summary | TimerBlock.tsx, AiSummaryBlock.tsx |

---

## 2. 기술 스택

### 프론트엔드

| 기술 | 버전 | 역할 |
|------|------|------|
| Next.js | 14.2.5 | 풀스택 프레임워크 (App Router) |
| React | 18 | UI 컴포넌트 라이브러리 |
| TypeScript | ^5 | 정적 타입 시스템 |
| Tailwind CSS | ^3.4.1 | 유틸리티 퍼스트 CSS |

### 백엔드/데이터베이스

| 기술 | 버전 | 역할 |
|------|------|------|
| Supabase | ^2.45.0 | PostgreSQL DB + Auth + RLS |
| Next.js API Routes | — | 서버사이드 API (AI 요약, 계정 삭제) |

### 주요 라이브러리

| 라이브러리 | 버전 | 용도 |
|------------|------|------|
| react-markdown | ^9.0.1 | 마크다운 → HTML 렌더링 |
| react-syntax-highlighter | ^15.5.0 | 코드 구문 강조 |
| bcryptjs | ^2.4.3 | 비밀번호 bcrypt 해싱 |
| katex | ^0.16.38 | LaTeX 수식 렌더링 |
| qrcode | ^1.5.4 | QR 코드 이미지 생성 |
| @dnd-kit/core | latest | 드래그앤드롭 코어 |
| @dnd-kit/sortable | latest | 정렬 가능한 리스트 |
| @anthropic-ai/sdk | — | Claude AI API (ai_summary 블록) |

### 배포

| 서비스 | 역할 |
|--------|------|
| Vercel | Next.js 호스팅 및 서버리스 함수 |
| Supabase Cloud | PostgreSQL DB, Auth, Storage |

### 디자인 시스템

- **스타일**: 글라스모피즘(Glassmorphism) — `backdrop-filter: blur`, `rgba` 배경
- **테마**: 하늘색(sky) 단일 테마 + 다크 모드 지원 (CSS 커스텀 프로퍼티)
- **CSS 클래스**: `glass-card`, `glass-header`, `glass-panel` 공통 유틸리티
- **컬러**: `sky-500` 계열 포인트 컬러, 그라데이션 강조

---

## 3. 파일 구조

```
note-archive/
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # 루트 레이아웃 (ThemeProvider, OfflineBanner)
│   │   ├── globals.css                 # 전역 CSS (glass-* 클래스, CSS 커스텀 프로퍼티)
│   │   ├── page.tsx                    # 메인 대시보드
│   │   ├── notes/
│   │   │   ├── new/
│   │   │   │   └── page.tsx            # 노트 생성 페이지
│   │   │   └── [id]/
│   │   │       └── page.tsx            # 노트 상세/편집 페이지
│   │   ├── api/
│   │   │   ├── ai-summary/
│   │   │   │   └── route.ts            # Claude AI 요약 API (서버사이드)
│   │   │   └── delete-account/
│   │   │       └── route.ts            # 계정 삭제 API
│   │   ├── calendar/
│   │   │   └── page.tsx                # 캘린더 페이지
│   │   └── reset-password/
│   │       └── page.tsx                # 비밀번호 재설정 페이지
│   ├── components/
│   │   ├── blocks/                     # 22종 블록 컴포넌트
│   │   │   ├── TextBlock.tsx
│   │   │   ├── CodeBlock.tsx
│   │   │   ├── TipBlock.tsx
│   │   │   ├── StepsBlock.tsx
│   │   │   ├── TableBlock.tsx
│   │   │   ├── ChecklistBlock.tsx
│   │   │   ├── FileBlock.tsx
│   │   │   ├── KeywordBlock.tsx
│   │   │   ├── FlowBlock.tsx
│   │   │   ├── FeatureListBlock.tsx
│   │   │   ├── KeyValueBlock.tsx
│   │   │   ├── ListBlock.tsx
│   │   │   ├── CredentialBlock.tsx
│   │   │   ├── LicenseBlock.tsx
│   │   │   ├── LinkBlock.tsx
│   │   │   ├── PollBlock.tsx
│   │   │   ├── MindmapBlock.tsx
│   │   │   ├── EmbedBlock.tsx
│   │   │   ├── ImageBlock.tsx
│   │   │   ├── MathBlock.tsx
│   │   │   ├── TimerBlock.tsx
│   │   │   └── AiSummaryBlock.tsx
│   │   ├── auth/                       # 인증 관련 컴포넌트
│   │   ├── ui/
│   │   │   └── Toast.tsx               # 토스트 알림
│   │   ├── calendar/                   # 캘린더 컴포넌트
│   │   ├── AccountModal.tsx            # 계정 관리 모달
│   │   ├── BackgroundPicker.tsx        # 배경 선택기
│   │   ├── BlockStatsChart.tsx         # 블록 통계 차트
│   │   ├── BlockTransferModal.tsx      # 블록 이동 모달
│   │   ├── ChangeLogModal.tsx          # 변경 이력 패널
│   │   ├── ContributionGraph.tsx       # 잔디 그래프
│   │   ├── DocsModal.tsx               # 가이드 문서 모달
│   │   ├── EmojiPicker.tsx             # 이모지 선택기
│   │   ├── ExportModal.tsx             # 내보내기 모달
│   │   ├── FolderModal.tsx             # 폴더/워크스페이스 모달
│   │   ├── MergeModal.tsx              # 노트 병합 모달
│   │   ├── NoteCard.tsx                # 노트 카드 컴포넌트
│   │   ├── NoteComments.tsx            # 노트 댓글 컴포넌트
│   │   ├── NoteTemplateModal.tsx       # 노트 템플릿 선택 모달
│   │   ├── OfflineBanner.tsx           # 오프라인 상태 배너
│   │   ├── PasswordModal.tsx           # 비밀번호 입력 모달
│   │   ├── QRModal.tsx                 # QR 코드 공유 모달
│   │   ├── SearchModal.tsx             # 검색 모달
│   │   ├── SlashCommand.tsx            # 슬래시 커맨드 팝업
│   │   ├── SortableBlock.tsx           # dnd-kit 드래그 래퍼
│   │   ├── TagInput.tsx                # 태그 입력 컴포넌트
│   │   ├── ThemeProvider.tsx           # 다크/라이트 모드 컨텍스트
│   │   ├── ThemeToggle.tsx             # 테마 전환 버튼
│   │   ├── TrashModal.tsx              # 휴지통 모달
│   │   └── WeeklyGoal.tsx              # 주간 목표 컴포넌트
│   └── lib/
│       └── supabase.ts                 # Supabase 클라이언트 + 전체 타입 정의
├── supabase/
│   └── schema.sql                      # DB 테이블 DDL + 마이그레이션
├── docs/                               # 문서 디렉토리
│   ├── MANUAL.md
│   ├── CHECKLIST.md
│   ├── ARCHITECTURE.md
│   ├── CONTEXT.md
│   └── CHANGELOG.md
├── public/                             # 정적 파일
├── .env.local                          # 환경변수 (git 제외)
├── .env.example                        # 환경변수 형식 예시
├── CLAUDE.md                           # 개발자 컨텍스트 문서
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 4. DB 스키마

### notes 테이블

노트의 메타데이터를 저장합니다.

```sql
CREATE TABLE notes (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  icon          TEXT NOT NULL DEFAULT '📝',
  title         TEXT NOT NULL,
  description   TEXT,
  tags          TEXT[] DEFAULT '{}',
  is_locked     BOOLEAN DEFAULT FALSE,
  password_hash TEXT,                            -- bcrypt 해시
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  deleted_at    TIMESTAMPTZ DEFAULT NULL,        -- soft delete
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()        -- 자동 갱신 트리거
);
```

### tabs 테이블

노트 내의 탭 구조를 저장합니다.

```sql
CREATE TABLE tabs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id     UUID REFERENCES notes(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT '탭 1',
  order_index INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### blocks 테이블

각 탭 내의 블록 내용을 저장합니다. `content`는 JSONB로 블록 타입별 자유로운 구조를 수용합니다.

```sql
CREATE TABLE blocks (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tab_id      UUID REFERENCES tabs(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN (
                'text','code','tip','steps','table','checklist','file',
                'keyword','flow','featurelist','keyvalue','list',
                'credential','license','link','poll','mindmap','embed',
                'image','math','timer','ai_summary'
              )),
  title       TEXT,
  show_title  BOOLEAN DEFAULT FALSE,
  content     JSONB NOT NULL DEFAULT '{}',     -- 블록 타입별 자유 구조
  order_index INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### note_history 테이블

노트 변경 사유와 일시를 기록합니다.

```sql
CREATE TABLE note_history (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id    UUID REFERENCES notes(id) ON DELETE CASCADE,
  message    TEXT NOT NULL,                    -- 변경 사유 텍스트
  changed_at TIMESTAMPTZ DEFAULT now()
);
```

### note_comments 테이블

노트에 달린 댓글을 저장합니다.

```sql
CREATE TABLE note_comments (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id    UUID REFERENCES notes(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### documents 테이블

앱 내 가이드 문서를 저장합니다.

```sql
CREATE TABLE documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  content     TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### blocked_ips 테이블

IP 차단 목록입니다. 미들웨어에서 anon key로 접근합니다.

```sql
CREATE TABLE blocked_ips (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip         TEXT NOT NULL UNIQUE,
  reason     TEXT,
  blocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### RLS 정책 요약

| 테이블 | 정책 | 역할 | 작업 |
|--------|------|------|------|
| notes | 본인 노트만 관리 | authenticated | ALL |
| notes | 익명 조회 허용 | anon | SELECT |
| tabs | 노트 소유자만 관리 | authenticated | ALL |
| tabs | 익명 조회 허용 | anon | SELECT |
| blocks | 노트 소유자만 관리 | authenticated | ALL |
| blocks | 익명 조회 허용 | anon | SELECT |
| note_history | 본인 노트 이력만 관리 | authenticated | ALL |
| note_comments | 본인 댓글만 관리 | authenticated | ALL |
| note_comments | 노트 소유자 조회 | authenticated | SELECT |
| blocked_ips | 익명 조회 허용 | anon | SELECT |
| blocked_ips | 인증 사용자 전체 관리 | authenticated | ALL |

---

## 5. 상태 관리 패턴

### pendingChanges ref 패턴 (블록 편집)

실시간 저장 대신 **완료 버튼 클릭 시 일괄 저장** 방식을 채택합니다.

```typescript
const pendingChanges = useRef<Record<string, Record<string, unknown>>>({});
const pendingTitles  = useRef<Record<string, string>>({});

// 블록 내용 변경 시 (리렌더링 없음)
function handleBlockChange(blockId: string, content: Record<string, unknown>) {
  pendingChanges.current[blockId] = content;
}

// 완료 버튼 클릭 시
async function handleComplete() {
  // 반드시 먼저 로컬 변수로 복사 (setBlocks 비동기 실행 전에 ref 초기화 방지)
  const changes = { ...pendingChanges.current };
  const titleChanges = { ...pendingTitles.current };
  pendingChanges.current = {};
  pendingTitles.current = {};

  // DB 저장
  for (const [blockId, content] of Object.entries(changes)) {
    await supabase.from('blocks').update({ content }).eq('id', blockId);
  }
}
```

**이 패턴을 선택한 이유**: Korean IME(한국어 입력기) 조합 중 onChange가 여러 번 호출되는 문제를 방지하고, 불필요한 리렌더링을 줄이며, 네트워크 요청 횟수를 최소화하기 위해서입니다.

### 블록 내부 useState 패턴 (Korean IME 이슈)

모든 블록 컴포넌트는 props의 `content`를 내부 `useState`로 관리합니다.

```typescript
// 블록 컴포넌트 내부
const [localContent, setLocalContent] = useState(props.content);

useEffect(() => {
  setLocalContent(props.content);  // 외부 변경사항 동기화
}, [props.content]);

function handleChange(newContent) {
  setLocalContent(newContent);           // 내부 state 업데이트 (즉시 반영)
  props.onChange(newContent);            // 부모 pendingChanges ref 업데이트 (리렌더링 없음)
}
```

**이유**: IME 조합 중에 props를 직접 수정하면 조합이 끊기는 문제가 발생합니다. 내부 state로 관리하고 부모의 ref만 업데이트하면 이 문제를 방지할 수 있습니다.

### sessionStorage — 잠금 해제 세션 유지

잠금 노트를 열 때 비밀번호를 `sessionStorage`에 저장하여, 같은 브라우저 세션 내에서 재입력을 방지합니다.

```typescript
// 잠금 해제 후
sessionStorage.setItem(`note_unlocked_${noteId}`, 'true');

// 노트 열기 시 확인
const isUnlocked = sessionStorage.getItem(`note_unlocked_${noteId}`) === 'true';
```

**localStorage 대신 sessionStorage를 선택한 이유**: 브라우저 탭을 닫으면 자동으로 초기화되어 보안성이 높습니다. 영구 저장이 필요한 테마 설정 등은 `localStorage`를 사용합니다.

### localStorage — 테마, 최근 노트, 주간 목표

```typescript
// 테마
localStorage.setItem('theme', 'dark' | 'light');

// 최근 본 노트 (최대 10개)
const history = JSON.parse(localStorage.getItem('recentNotes') || '[]');

// 주간 목표
localStorage.setItem('weeklyGoal', String(goal));
```

---

## 6. 컴포넌트 구조

### 페이지 레벨 컴포넌트

```
layout.tsx
└── ThemeProvider              # 다크/라이트 모드 컨텍스트 제공
    ├── OfflineBanner          # 네트워크 상태 감지
    └── {children}

page.tsx (대시보드)
├── ContributionGraph          # 잔디 그래프
├── BlockStatsChart            # 블록 통계
├── WeeklyGoal                 # 주간 목표
├── SearchModal                # 검색 모달 (Portal)
├── TrashModal                 # 휴지통 모달 (Portal)
├── NoteCard[]                 # 노트 카드 목록
└── PasswordModal              # 잠금 노트 비밀번호 모달 (Portal)

notes/[id]/page.tsx (노트 상세)
├── 탭 바
│   └── 탭 버튼[]
├── 블록 목록 (DndContext)
│   └── SortableBlock[]        # dnd-kit 드래그 래퍼
│       └── [블록 컴포넌트]    # 22종 중 해당 타입
├── SlashCommand               # 슬래시 커맨드 팝업 (Portal)
├── ChangeLogModal             # 변경 이력 (Portal)
├── NoteComments               # 댓글 영역
├── QRModal                    # QR 코드 (Portal)
├── MergeModal                 # 병합 (Portal)
├── ExportModal                # 내보내기 (Portal)
└── BlockTransferModal         # 블록 이동 (Portal)
```

### 블록 컴포넌트 공통 인터페이스

```typescript
interface BlockProps {
  content: Record<string, unknown>;  // JSONB 블록 내용
  isEditing: boolean;                // 편집 모드 여부
  onChange: (content: Record<string, unknown>) => void;  // pendingChanges 업데이트
}
```

### Modal/Portal 패턴

`overflow-clip` 설정된 컨테이너 내에서 모달이 잘리는 문제를 방지하기 위해 `createPortal`을 사용합니다.

```typescript
import { createPortal } from 'react-dom';

function Modal({ children, onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-50 ...">
      {children}
    </div>,
    document.body  // body에 직접 렌더링
  );
}
```

---

## 7. API 라우트

### POST `/api/ai-summary`

Claude Haiku를 사용하여 노트 내용을 요약합니다.

- **요청**: `{ content: string }` — 요약할 텍스트
- **응답**: `{ summary: string }` — 요약 결과
- **인증**: 서버사이드에서 `ANTHROPIC_API_KEY` 사용 (클라이언트 노출 없음)
- **오류 처리**: API 키 없음, 네트워크 오류, 응답 파싱 오류

### POST `/api/delete-account`

로그인된 사용자의 계정을 완전히 삭제합니다.

- **요청**: 인증 토큰 (Authorization 헤더)
- **응답**: `{ success: true }` 또는 오류
- **처리**: 사용자의 모든 노트/탭/블록 cascade 삭제 후 auth.users에서 삭제

---

## 8. 데이터 흐름

### 노트 편집 흐름

```
사용자 입력
  └── 블록 컴포넌트 내부 useState 업데이트 (즉시, IME 안전)
      └── props.onChange 호출
          └── pendingChanges.current[blockId] = content (ref, 리렌더링 없음)

완료 버튼 클릭
  └── SaveReasonModal (변경 사유 입력)
      └── handleComplete()
          ├── changes = {...pendingChanges.current} (로컬 복사)
          ├── pendingChanges.current = {} (초기화)
          ├── Supabase UPDATE blocks SET content = ... (각 블록)
          ├── note_history INSERT (변경 사유)
          └── setIsEditing(false)
```

### 노트 조회 흐름

```
/notes/[id] 접근
  └── Supabase SELECT notes WHERE id = :id
      └── 잠금 확인
          ├── is_locked = false → 바로 표시
          └── is_locked = true
              ├── sessionStorage 확인
              │   ├── 해제 기록 있음 → 바로 표시
              │   └── 해제 기록 없음 → PasswordModal 표시
              └── 비밀번호 확인 후 → sessionStorage 저장 → 표시
  └── Supabase SELECT tabs WHERE note_id = :id (ORDER BY order_index)
  └── Supabase SELECT blocks WHERE tab_id IN (...) (ORDER BY order_index)
```
