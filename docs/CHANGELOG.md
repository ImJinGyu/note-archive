# Note Archive — 변경 로그 (CHANGELOG)

이 문서는 Note Archive의 주요 변경사항을 버전별로 기록합니다.

---

## [v0.2.0] — 2026-03-18

대규모 기능 추가 릴리즈. 블록 타입을 13종에서 22종으로 확장하고, 협업/생산성 기능을 대폭 추가했습니다.

---

### 새로운 블록 타입 (9종 추가)

#### 이미지 블록 (`image`) — ImageBlock.tsx

- 이미지 파일 업로드 및 URL 입력 지원
- 클릭 시 라이트박스(전체 화면 뷰어) 오버레이 표시
- 이미지 캡션(설명) 입력 기능

#### 수식 블록 (`math`) — MathBlock.tsx

- KaTeX 라이브러리를 사용한 LaTeX 수식 렌더링
- 편집 모드와 미리보기 모드 분리
- `katex` 패키지 추가 (`^0.16.38`)

#### 타이머/뽀모도로 블록 (`timer`) — TimerBlock.tsx

- 작업 시간(기본 25분) / 휴식 시간(기본 5분) 설정 가능
- 시작, 일시정지, 초기화 버튼 제공
- 타이머 완료 시 알림 표시

#### 투표/설문 블록 (`poll`) — PollBlock.tsx

- 투표 항목 추가/삭제
- 항목별 투표 수 기록 및 프로그레스 바 표시
- 편집 모드에서 항목 관리, 미리보기 모드에서 투표 실행

#### 마인드맵 블록 (`mindmap`) — MindmapBlock.tsx

- SVG 기반 트리 구조 마인드맵 렌더링
- 중심 노드와 자식 노드 계층적 입력
- 선과 노드가 자동 배치되는 인터랙티브 다이어그램

#### 임베드 블록 (`embed`) — EmbedBlock.tsx

- YouTube 동영상 URL → 인라인 플레이어 자동 변환
- GitHub Gist URL → 코드 스니펫 임베드
- 기타 iframe 지원 URL 삽입

#### 라이선스 블록 (`license`) — LicenseBlock.tsx

- 오픈소스 라이선스 정보 구조화 저장
- 라이선스 종류, 저작권자, 적용 범위 입력 필드

#### AI 요약 블록 (`ai_summary`) — AiSummaryBlock.tsx

- **Claude Haiku** AI 모델을 사용한 노트 내용 자동 요약
- 서버사이드 API Route(`/api/ai-summary`)를 통한 안전한 처리
- `ANTHROPIC_API_KEY` 서버 환경변수로 보호 (클라이언트 미노출)
- 요약 생성 버튼 클릭 → 현재 탭 전체 블록 내용 분석 → 요약문 표시

#### 자격증명 블록 (`credential`) — CredentialBlock.tsx

- 민감한 자격증명(API 키, 비밀번호, 접속 정보) 저장
- 값 기본 마스킹 처리 (● ● ●), 클릭으로 표시/숨김 토글
- 잠금 노트와 조합하여 이중 보안 가능

---

### 새로운 기능 (15종 추가)

#### 드래그앤드롭 블록 순서 변경

- `@dnd-kit/core`, `@dnd-kit/sortable` 패키지 도입
- `SortableBlock.tsx` 래퍼 컴포넌트로 모든 블록에 드래그 기능 적용
- 드래그 핸들 아이콘을 잡고 상하로 드래그하여 블록 순서 변경
- 드롭 후 DB의 `order_index` 일괄 업데이트

#### 잠금 해제 세션 유지

- `sessionStorage` 기반 잠금 해제 상태 지속
- 같은 브라우저 탭 세션 동안 잠금 노트 재입력 불필요
- 탭/창 닫기 시 자동 초기화 (보안 유지)

#### 슬래시 커맨드 (`/`) — SlashCommand.tsx

- 빈 줄 또는 편집 중 `/` 입력 시 블록 추가 팝업 표시
- 팝업에서 블록 타입 이름 타이핑으로 실시간 검색
- `createPortal`로 `overflow: clip` 컨테이너 밖에 렌더링

#### 최근 본 노트 히스토리

- 노트 방문 시 `localStorage`에 기록 (최대 10개)
- 대시보드에서 최근 본 노트 목록 표시
- 클릭 시 해당 노트로 즉시 이동

#### 즐겨찾기 핀 고정

- 노트 카드 또는 상세 페이지에서 핀 아이콘 클릭으로 고정
- 고정된 노트는 대시보드 카드 목록 최상단에 배치
- `notes` 테이블에 `is_pinned` 컬럼으로 관리

#### 노트 복제

- 현재 노트의 탭/블록을 포함한 전체 구조 복사
- 복제된 노트 제목 앞 "복사본 - " 자동 추가
- 복제 완료 후 복제된 노트로 자동 이동

#### 노트 병합 — MergeModal.tsx

- 다른 노트의 탭/블록을 현재 노트에 합치기
- 병합 대상 노트 목록에서 선택
- 대상 노트의 탭과 블록이 현재 노트에 추가 (원본 유지)

#### 노트 댓글 — NoteComments.tsx

- 노트별 코멘트 작성 기능
- `note_comments` 테이블 신규 추가
- 로그인 사용자만 작성 가능, 본인 댓글만 삭제 가능
- RLS 정책으로 본인 노트의 댓글만 조회

#### 변경 사유 기록 + 이력 패널 — ChangeLogModal.tsx

- 편집 완료 시 SaveReasonModal에서 변경 사유 텍스트 입력
- `note_history` 테이블에 사유 + 타임스탬프 저장
- ChangeLogModal에서 전체 이력 목록 표시 (최신순)
- `ConfirmDialog` 단순 확인 방식에서 사유 입력 방식으로 변경

#### QR 코드 공유 — QRModal.tsx

- 노트 상세 페이지 URL을 QR 코드로 변환
- `qrcode` 패키지로 PNG 이미지 생성
- QR 이미지 화면 표시 및 다운로드 지원
- 모바일 기기에서 스캔 → 바로 노트 접근

#### 글쓰기 잔디 그래프 — ContributionGraph.tsx

- GitHub 스타일의 날짜별 작성 활동 히트맵
- 지난 1년간 일별 노트 생성/수정 횟수 시각화
- 색상 농도로 활동량 표현 (연한 하늘색 → 진한 하늘색)

#### 블록 타입 통계 차트 — BlockStatsChart.tsx

- 사용 중인 블록을 타입별로 집계
- 바 차트 또는 도넛 차트로 시각화
- 어떤 유형의 블록을 주로 사용하는지 파악

#### 주간 목표 설정 — WeeklyGoal.tsx

- 이번 주 노트 작성 목표 개수 설정
- 이번 주 실제 작성 노트 수와 달성률 표시
- `localStorage`에 목표값 저장

#### 전체 태그 필터 뷰

- 대시보드에 등록된 모든 태그 목록 표시
- 태그 클릭 시 해당 태그가 붙은 노트만 필터링
- 복수 태그 AND/OR 필터 지원

#### 오프라인 배너 — OfflineBanner.tsx

- `window.addEventListener('offline'/'online')` 기반 네트워크 감지
- 오프라인 시 상단에 배너 표시, 온라인 복구 시 자동 숨김
- `next-pwa` 의존성 없이 동작 (PWA 비활성화 결정에 따른 폴백)

---

### 기술적 변경사항

#### 다크 모드 지원

- CSS 커스텀 프로퍼티(`--bg-primary`, `--text-primary`, `--glass-bg` 등) 기반
- Tailwind `dark:` 클래스 미사용 (글라스모피즘 디자인과 호환성 때문)
- `ThemeProvider.tsx` + `ThemeToggle.tsx` 컴포넌트 추가
- `data-theme="dark"` 어트리뷰트로 전환, `localStorage`에 저장

#### 폴더/워크스페이스 — FolderModal.tsx

- 노트를 그룹으로 묶는 폴더 기능 추가
- 폴더별 노트 목록 관리

#### 블록 이동 — BlockTransferModal.tsx

- 현재 블록을 다른 탭 또는 다른 노트로 이전
- 대상 노트/탭 목록에서 선택 후 이동 실행

#### 배경 선택 — BackgroundPicker.tsx

- 노트 또는 앱 배경 커스터마이징
- 다양한 배경 패턴/색상 선택 가능

#### 템플릿 — NoteTemplateModal.tsx

- 자주 사용하는 노트 구조를 템플릿으로 저장/불러오기

#### IP 차단 미들웨어

- `blocked_ips` 테이블에 등록된 IP 주소 접근 차단
- Next.js 미들웨어(`middleware.ts`)에서 처리
- Supabase anon key로 차단 목록 조회

#### 계정 삭제 API — `/api/delete-account`

- 사용자 계정 및 모든 데이터(노트/탭/블록) 완전 삭제
- 서버사이드 처리로 Supabase service_role key 사용

---

### DB 스키마 변경

- `notes.deleted_at TIMESTAMPTZ` 컬럼 추가 (소프트 삭제)
- `notes.user_id UUID` 컬럼 추가 (사용자 소속)
- `blocks.type` CHECK 제약 조건 확장 (13종 → 22종)
- `note_history` 테이블 신규 추가 (변경 이력)
- `note_comments` 테이블 신규 추가 (노트 댓글)
- `documents` 테이블 신규 추가 (가이드 문서)
- `blocked_ips` 테이블 신규 추가 (IP 차단)

---

### 의존성 변경

**추가**:
- `katex` `^0.16.38` — 수식 렌더링
- `qrcode` `^1.5.4` — QR 코드 생성
- `@types/katex` `^0.16.8`
- `@types/qrcode` `^1.5.6`
- `@dnd-kit/core` — 드래그앤드롭
- `@dnd-kit/sortable` — 정렬 가능 리스트
- `@dnd-kit/utilities` — dnd-kit 유틸리티

**제거/불채택**:
- `next-pwa` — Next.js 14 App Router 호환성 문제로 미채택

---

## [v0.1.0] — 초기 릴리즈

Note Archive의 첫 번째 릴리즈. 개인 공부 필기를 저장하고 열람하는 기본 기능을 제공합니다.

---

### 코어 기능

- **노트 CRUD** — 생성(아이콘, 제목, 설명, 태그), 조회, 편집, 소프트 삭제
- **탭 구조** — 노트 내 여러 탭으로 내용 분류 (추가, 삭제, 이름 변경)
- **블록 편집** — 블록 추가/편집/삭제/순서 변경 (위/아래 이동)
- **완료 버튼 일괄 저장** — pendingChanges ref 패턴으로 DB 요청 최소화

---

### 블록 타입 (13종)

| 블록 | 설명 |
|------|------|
| `text` | 마크다운 텍스트 (react-markdown 렌더링) |
| `code` | 코드 구문 강조 (react-syntax-highlighter) |
| `tip` | 아이콘 + 강조 내용 |
| `steps` | 번호 단계 + 설명 + 코드 |
| `table` | 동적 행/열 테이블 |
| `checklist` | 체크박스 + 진행률 바 |
| `file` | 파일 첨부 + 미리보기 (이미지/PDF/텍스트) |
| `keyword` | 번호 배지 + 키워드 + 예시 코드 |
| `flow` | 가로 단계 다이어그램 |
| `featurelist` | 원형 아이콘 + 기능 목록 |
| `keyvalue` | 키-값 쌍 정리 |
| `list` | 불릿/번호 목록 |
| `credential` | 자격증명 마스킹 저장 |

---

### 인증 및 보안

- **Supabase Auth** — 이메일/비밀번호 로그인/회원가입
- **비밀번호 재설정** — 이메일 링크 방식
- **잠금 노트** — bcrypt 비밀번호 해시 저장
- **RLS** — 사용자별 데이터 격리 (authenticated 전용)

---

### 부가 기능

- **검색** (SearchModal) — 노트 제목/설명/태그 검색
- **휴지통** (TrashModal) — 소프트 삭제, 복구, 영구 삭제, 비우기
- **내보내기** (ExportModal) — 마크다운 파일 다운로드
- **이모지 아이콘 선택** (EmojiPicker) — 노트 아이콘 커스터마이징
- **태그 시스템** (TagInput) — 노트 태그 지정 및 표시
- **토스트 알림** (Toast) — 작업 완료/오류 피드백

---

### 기술 스택

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS (글라스모피즘 디자인)
- Supabase (PostgreSQL + Auth + RLS)
- react-markdown, react-syntax-highlighter, bcryptjs

---

### DB 스키마 (초기)

- `notes` 테이블 (id, icon, title, description, tags, is_locked, password_hash, user_id, created_at, updated_at)
- `tabs` 테이블 (id, note_id, name, order_index, created_at)
- `blocks` 테이블 (id, tab_id, type, title, show_title, content JSONB, order_index, created_at, updated_at)
- RLS 정책 — notes/tabs/blocks 각 테이블에 인증 사용자 전용 정책 적용
