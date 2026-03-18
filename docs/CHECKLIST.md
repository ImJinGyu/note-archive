# Note Archive — 품질 체크리스트

> 버전 0.2.0 기준 | 최종 수정: 2026-03-18

---

## 목차

1. [기능 구현 완료 체크리스트](#1-기능-구현-완료-체크리스트)
2. [블록 타입 22종 렌더 확인](#2-블록-타입-22종-렌더-확인)
3. [DB 마이그레이션 SQL 체크리스트](#3-db-마이그레이션-sql-체크리스트)
4. [환경변수 설정 체크리스트](#4-환경변수-설정-체크리스트)
5. [필수 패키지 설치 체크리스트](#5-필수-패키지-설치-체크리스트)
6. [배포 전 최종 점검](#6-배포-전-최종-점검)

---

## 1. 기능 구현 완료 체크리스트

### 인증 (Authentication)

- [ ] 이메일/비밀번호 회원가입
- [ ] 이메일/비밀번호 로그인
- [ ] 비밀번호 재설정 (이메일 링크)
- [ ] 계정 삭제 (`/api/delete-account`)
- [ ] Supabase Auth 세션 유지 (새로고침 후 로그인 상태 유지)
- [ ] 로그아웃

### 노트 CRUD

- [ ] 노트 생성 (아이콘, 제목, 설명, 태그, 잠금 설정)
- [ ] 노트 목록 조회 (삭제된 노트 제외: `deleted_at IS NULL`)
- [ ] 노트 상세 조회 (탭 + 블록 포함)
- [ ] 노트 메타데이터 수정 (제목, 설명, 태그, 아이콘)
- [ ] 노트 소프트 삭제 (`deleted_at` 컬럼에 타임스탬프 저장)
- [ ] 휴지통 목록 조회 (`deleted_at IS NOT NULL`)
- [ ] 휴지통에서 복구 (`deleted_at = null`)
- [ ] 영구 삭제 (DELETE)
- [ ] 휴지통 비우기 (일괄 DELETE)

### 블록 편집

- [ ] 블록 추가 (블록 선택 모달)
- [ ] 블록 내용 편집 (pendingChanges ref 패턴)
- [ ] 블록 타이틀 토글 및 편집
- [ ] 블록 순서 변경 (위/아래 이동 또는 dnd-kit 드래그)
- [ ] 블록 삭제 (확인 다이얼로그 포함)
- [ ] 완료 버튼 일괄 저장 (SaveReasonModal → 변경 사유 입력)
- [ ] 블록 이동 (다른 탭/노트로 이전, BlockTransferModal)

### 탭 관리

- [ ] 탭 추가
- [ ] 탭 삭제 (소속 블록 cascade 삭제 확인)
- [ ] 탭 이름 더블클릭 인라인 편집
- [ ] 탭 순서 변경

### 검색

- [ ] 검색 모달 (SearchModal) 열기/닫기
- [ ] 노트 제목/설명/태그 기준 검색
- [ ] 검색 결과 클릭 → 노트 이동

### 잠금 노트

- [ ] 비밀번호 설정 (bcrypt 해시 저장)
- [ ] 잠금 노트 열기 (비밀번호 입력 모달)
- [ ] 잘못된 비밀번호 시 오류 메시지 표시
- [ ] 잠금 해제 세션 유지 (sessionStorage)
- [ ] 잠금 노트 삭제 시 비밀번호 재확인

### 노트 복제

- [ ] 노트 복제 실행
- [ ] 복제 시 탭/블록 모두 포함 복사
- [ ] 복제된 노트 제목 앞 "복사본 - " 자동 추가

### 노트 병합 (MergeModal)

- [ ] 병합 대상 노트 목록 표시
- [ ] 병합 실행 (대상 노트의 탭/블록이 현재 노트에 추가)

### 대시보드 기능

- [ ] 글쓰기 잔디 그래프 (ContributionGraph) 렌더링
- [ ] 블록 타입 통계 차트 (BlockStatsChart) 렌더링
- [ ] 주간 목표 설정 및 진행률 표시 (WeeklyGoal)
- [ ] 태그 필터 (클릭 시 해당 태그 노트만 표시)
- [ ] 핀 고정 노트 목록 상단 배치
- [ ] 최근 본 노트 히스토리 (localStorage)
- [ ] 노트 개수 / 블록 개수 통계 표시

### QR 공유 (QRModal)

- [ ] QR 코드 생성 (현재 노트 URL)
- [ ] QR 이미지 다운로드

### 변경 이력 (ChangeLogModal)

- [ ] 편집 완료 시 SaveReasonModal에서 변경 사유 입력
- [ ] `note_history` 테이블에 저장
- [ ] 이력 패널에서 변경 사유 + 날짜 목록 표시

### 댓글 (NoteComments)

- [ ] 댓글 작성 (로그인 필요)
- [ ] 댓글 목록 표시
- [ ] 본인 댓글 삭제

### AI 요약 (AiSummaryBlock)

- [ ] `/api/ai-summary` 서버사이드 API 동작 확인
- [ ] `ANTHROPIC_API_KEY` 환경변수 설정 확인
- [ ] 요약 결과 블록에 표시

### 내보내기 (ExportModal)

- [ ] 마크다운 형식 내보내기
- [ ] 파일 다운로드 동작 확인

### 슬래시 커맨드 (SlashCommand)

- [ ] `/` 입력 시 블록 추가 팝업 표시
- [ ] 타이핑으로 블록 타입 검색
- [ ] 선택 시 해당 블록 삽입

### 다크 모드

- [ ] 라이트/다크 모드 전환 (ThemeToggle)
- [ ] 선택 테마 localStorage 저장
- [ ] 새로고침 후 테마 유지

### 오프라인 배너

- [ ] 네트워크 끊김 시 OfflineBanner 표시
- [ ] 네트워크 복구 시 배너 자동 숨김

### 캘린더

- [ ] 캘린더 페이지(`/calendar`) 접근 가능
- [ ] 날짜별 노트 작성 현황 표시

---

## 2. 블록 타입 22종 렌더 확인

각 블록 타입에 대해 **편집 모드**와 **미리보기 모드** 모두 확인합니다.

| # | 블록 타입 | 파일 | 편집 모드 | 미리보기 모드 | 추가/삭제 |
|---|-----------|------|-----------|---------------|-----------|
| 1 | `text` | TextBlock.tsx | [ ] | [ ] | [ ] |
| 2 | `code` | CodeBlock.tsx | [ ] | [ ] | [ ] |
| 3 | `tip` | TipBlock.tsx | [ ] | [ ] | [ ] |
| 4 | `steps` | StepsBlock.tsx | [ ] | [ ] | [ ] |
| 5 | `table` | TableBlock.tsx | [ ] | [ ] | [ ] |
| 6 | `checklist` | ChecklistBlock.tsx | [ ] | [ ] | [ ] |
| 7 | `file` | FileBlock.tsx | [ ] | [ ] | [ ] |
| 8 | `keyword` | KeywordBlock.tsx | [ ] | [ ] | [ ] |
| 9 | `flow` | FlowBlock.tsx | [ ] | [ ] | [ ] |
| 10 | `featurelist` | FeatureListBlock.tsx | [ ] | [ ] | [ ] |
| 11 | `keyvalue` | KeyValueBlock.tsx | [ ] | [ ] | [ ] |
| 12 | `list` | ListBlock.tsx | [ ] | [ ] | [ ] |
| 13 | `credential` | CredentialBlock.tsx | [ ] | [ ] | [ ] |
| 14 | `license` | LicenseBlock.tsx | [ ] | [ ] | [ ] |
| 15 | `link` | LinkBlock.tsx | [ ] | [ ] | [ ] |
| 16 | `poll` | PollBlock.tsx | [ ] | [ ] | [ ] |
| 17 | `mindmap` | MindmapBlock.tsx | [ ] | [ ] | [ ] |
| 18 | `embed` | EmbedBlock.tsx | [ ] | [ ] | [ ] |
| 19 | `image` | ImageBlock.tsx | [ ] | [ ] | [ ] |
| 20 | `math` | MathBlock.tsx | [ ] | [ ] | [ ] |
| 21 | `timer` | TimerBlock.tsx | [ ] | [ ] | [ ] |
| 22 | `ai_summary` | AiSummaryBlock.tsx | [ ] | [ ] | [ ] |

### 블록 추가 확인 사항

- [ ] 블록 선택 모달에서 22종 모두 표시됨
- [ ] 블록 선택 모달 호버 미리보기 정상 동작
- [ ] 슬래시 커맨드(/)로 블록 추가 가능
- [ ] SortableBlock.tsx 드래그앤드롭 순서 변경 정상 동작

### 블록 특이사항 확인

- [ ] `file` 블록 — 이미지 미리보기 (img 태그)
- [ ] `file` 블록 — PDF 미리보기 (Blob URL iframe)
- [ ] `file` 블록 — 텍스트 파일 한글 깨짐 없음 (TextDecoder utf-8)
- [ ] `code` 블록 — 복사 버튼 클립보드 복사 동작
- [ ] `checklist` 블록 — 진행률 프로그레스 바 계산 정확
- [ ] `math` 블록 — KaTeX 수식 렌더링 (오류 없음)
- [ ] `image` 블록 — 라이트박스 열기/닫기
- [ ] `embed` 블록 — YouTube URL 플레이어 변환
- [ ] `embed` 블록 — GitHub Gist URL 임베드
- [ ] `ai_summary` 블록 — AI 요약 API 호출 및 결과 표시
- [ ] `timer` 블록 — 시작/일시정지/초기화 동작
- [ ] `credential` 블록 — 값 마스킹/표시 토글

---

## 3. DB 마이그레이션 SQL 체크리스트

Supabase 콘솔(SQL Editor)에서 다음 마이그레이션이 모두 적용되었는지 확인합니다.

### 기본 테이블 생성

- [ ] `notes` 테이블 생성
- [ ] `tabs` 테이블 생성
- [ ] `blocks` 테이블 생성
- [ ] `update_updated_at_column()` 함수 생성
- [ ] `update_notes_updated_at` 트리거 생성
- [ ] `update_blocks_updated_at` 트리거 생성

### RLS (Row Level Security) 설정

- [ ] `notes` 테이블 RLS 활성화
- [ ] `tabs` 테이블 RLS 활성화
- [ ] `blocks` 테이블 RLS 활성화
- [ ] 정책: `Users can manage own notes` (notes, authenticated)
- [ ] 정책: `Anon can view all notes` (notes, anon)
- [ ] 정책: `Note owner can manage tabs` (tabs, authenticated)
- [ ] 정책: `Anon can view tabs` (tabs, anon)
- [ ] 정책: `Note owner can manage blocks` (blocks, authenticated)
- [ ] 정책: `Anon can view blocks` (blocks, anon)

### 마이그레이션: 추가 컬럼 및 제약 조건

- [ ] `notes.deleted_at TIMESTAMPTZ` 컬럼 추가
- [ ] `notes.user_id UUID` 컬럼 추가 (기존 테이블이 있는 경우)
- [ ] `blocks_type_check` 제약 조건 갱신 (22종 블록 타입 포함)

```
CHECK (type IN (
  'text','code','tip','steps','table','checklist','file',
  'keyword','flow','featurelist','keyvalue','list',
  'credential','license','link','poll','mindmap','embed',
  'image','math','timer','ai_summary'
))
```

### 마이그레이션: 추가 테이블

- [ ] `note_history` 테이블 생성
- [ ] `note_history` RLS 활성화
- [ ] 정책: `Users manage own history` (note_history)
- [ ] `note_comments` 테이블 생성
- [ ] `note_comments` RLS 활성화
- [ ] 정책: `Users manage own comments` (note_comments)
- [ ] 정책: `Note owner can view comments` (note_comments)
- [ ] `documents` 테이블 생성 (가이드 문서용)
- [ ] `blocked_ips` 테이블 생성
- [ ] `blocked_ips` RLS 활성화

### 검증

- [ ] Supabase Table Editor에서 모든 테이블 확인
- [ ] 테스트 노트 생성 → 탭 추가 → 블록 추가 → 저장 → 조회 전체 플로우 정상 동작

---

## 4. 환경변수 설정 체크리스트

프로젝트 루트의 `.env.local` 파일에 다음 항목이 설정되어 있는지 확인합니다.

### 필수 환경변수

- [ ] `NEXT_PUBLIC_SUPABASE_URL` — Supabase 프로젝트 URL
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
  ```

- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase Anonymous Key
  ```
  NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
  ```

### AI 요약 기능용 환경변수

- [ ] `ANTHROPIC_API_KEY` — Anthropic Claude API 키 (서버사이드 전용, `NEXT_PUBLIC_` 접두사 없음)
  ```
  ANTHROPIC_API_KEY=sk-ant-...
  ```

### 확인 사항

- [ ] `.env.local` 파일이 `.gitignore`에 포함되어 있음 (커밋되지 않음)
- [ ] `.env.example` 파일에 키 형식만 기재되어 있음 (실제 값 없음)
- [ ] `ANTHROPIC_API_KEY`가 클라이언트 사이드에 노출되지 않음 (`NEXT_PUBLIC_` 접두사 없음 확인)
- [ ] Vercel 배포 시 환경변수 대시보드에 동일하게 등록됨

---

## 5. 필수 패키지 설치 체크리스트

`npm install` 후 다음 패키지들이 `node_modules`에 존재하는지 확인합니다.

### 런타임 의존성 (dependencies)

| 패키지 | 버전 | 용도 | 설치 확인 |
|--------|------|------|-----------|
| `next` | ^14.2.5 | 프레임워크 | [ ] |
| `react` | ^18 | UI 라이브러리 | [ ] |
| `react-dom` | ^18 | DOM 렌더링 | [ ] |
| `@supabase/supabase-js` | ^2.45.0 | DB/Auth | [ ] |
| `react-markdown` | ^9.0.1 | 마크다운 렌더링 | [ ] |
| `react-syntax-highlighter` | ^15.5.0 | 코드 구문 강조 | [ ] |
| `bcryptjs` | ^2.4.3 | 비밀번호 해시 | [ ] |
| `katex` | ^0.16.38 | 수식 렌더링 | [ ] |
| `qrcode` | ^1.5.4 | QR 코드 생성 | [ ] |

### 개발 의존성 (devDependencies)

| 패키지 | 버전 | 용도 | 설치 확인 |
|--------|------|------|-----------|
| `typescript` | ^5 | 타입 시스템 | [ ] |
| `tailwindcss` | ^3.4.1 | CSS 프레임워크 | [ ] |
| `autoprefixer` | ^10.0.1 | CSS 자동 접두사 | [ ] |
| `postcss` | ^8 | CSS 처리 | [ ] |
| `@types/node` | ^20 | Node.js 타입 | [ ] |
| `@types/react` | ^18 | React 타입 | [ ] |
| `@types/react-dom` | ^18 | ReactDOM 타입 | [ ] |
| `@types/bcryptjs` | ^2.4.6 | bcryptjs 타입 | [ ] |
| `@types/katex` | ^0.16.8 | KaTeX 타입 | [ ] |
| `@types/qrcode` | ^1.5.6 | qrcode 타입 | [ ] |
| `@types/react-syntax-highlighter` | ^15.5.13 | 구문 강조 타입 | [ ] |

### v0.2.0에서 추가된 패키지

- [ ] `@dnd-kit/core` — 드래그앤드롭 코어
- [ ] `@dnd-kit/sortable` — 정렬 가능한 드래그앤드롭
- [ ] `@dnd-kit/utilities` — dnd-kit 유틸리티

> **설치 명령어**: `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`

### 설치 확인 명령어

```bash
# 전체 패키지 설치
npm install

# 설치 후 빌드 테스트
npm run build

# 개발 서버 실행
npm run dev
```

---

## 6. 배포 전 최종 점검

### 빌드 확인

- [ ] `npm run build` 오류 없이 완료
- [ ] TypeScript 타입 오류 없음 (또는 known non-blocking 오류만 존재)
- [ ] ESLint 경고/오류 없음

### 기능 최종 테스트

- [ ] 새 계정으로 회원가입 → 로그인 → 노트 생성 → 블록 추가 → 저장 → 조회 전체 플로우
- [ ] 잠금 노트 생성 → 잠금 해제 → 편집 → 저장
- [ ] 휴지통 → 복구 → 영구 삭제
- [ ] QR 코드 생성 및 스캔 확인
- [ ] AI 요약 블록 동작 확인
- [ ] 다크 모드 전환 및 저장 확인
- [ ] 모바일 반응형 레이아웃 확인

### 보안 확인

- [ ] `ANTHROPIC_API_KEY` 클라이언트 노출 없음
- [ ] Supabase RLS 정책 모든 테이블 적용 확인
- [ ] 타 사용자 노트 접근 불가 확인 (RLS 검증)
- [ ] bcrypt 비밀번호 해시 저장 확인

### Vercel 배포 설정

- [ ] GitHub 저장소와 Vercel 연결
- [ ] 환경변수 Vercel 대시보드에 등록 (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`)
- [ ] 배포 후 프로덕션 URL에서 동작 확인
- [ ] Supabase 대시보드에서 허용 도메인(CORS) 설정 확인
