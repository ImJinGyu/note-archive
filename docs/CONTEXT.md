# Note Archive — 개발 맥락 및 기술 결정 이력

> 버전 0.2.0 기준 | 최종 수정: 2026-03-18

이 문서는 Note Archive 개발 과정에서 내린 중요한 기술적 결정사항과 그 이유를 기록합니다. 향후 유지보수나 리팩토링 시 "왜 이렇게 했는가"를 파악하는 데 사용합니다.

---

## 목차

1. [Korean IME 이슈 해결책](#1-korean-ime-이슈-해결책)
2. [잠금 세션 유지 — sessionStorage vs localStorage](#2-잠금-세션-유지--sessionstorage-vs-localstorage)
3. [완료 버튼 일괄 저장 방식](#3-완료-버튼-일괄-저장-방식)
4. [다크 모드 — dark: 클래스 미사용](#4-다크-모드--dark-클래스-미사용)
5. [PWA 실패 → OfflineBanner 폴백](#5-pwa-실패--offlinebanner-폴백)
6. [AI 요약 서버사이드 API Route](#6-ai-요약-서버사이드-api-route)
7. [createPortal 패턴](#7-createportal-패턴)
8. [Supabase 타입 never 오류](#8-supabase-타입-never-오류)
9. [BlockType 타입 확장 이력](#9-blocktype-타입-확장-이력)
10. [변경 이력 기록 — ConfirmDialog → SaveReasonModal](#10-변경-이력-기록--confirmdialog--savereasonmodal)
11. [PDF 미리보기 — data: URL 차단 우회](#11-pdf-미리보기--data-url-차단-우회)
12. [FileReader 이중 호출 방지](#12-filereader-이중-호출-방지)
13. [pendingChanges ref 복사 순서](#13-pendingchanges-ref-복사-순서)

---

## 1. Korean IME 이슈 해결책

### 문제

한국어(Korean IME)를 입력할 때 `onChange` 이벤트가 조합 중(composing)에도 발생합니다. React에서 블록 컨텐츠를 `props`로 직접 관리하면 조합 중인 글자가 부모 컴포넌트의 리렌더링을 유발하고, 이로 인해 IME 조합이 끊어지는 현상이 발생합니다.

**증상**: 한글 입력 중 글자가 분리되거나(예: "한글" → "ㅎㅏㄴㄱㅡㄹ"), 커서가 예상치 못한 위치로 이동합니다.

### 결정

**모든 블록 컴포넌트는 내부 `useState`로 콘텐츠를 자체 관리**합니다. 부모 컴포넌트는 `pendingChanges ref`만 업데이트하며 리렌더링되지 않습니다.

```typescript
// 올바른 패턴
function TextBlock({ content, onChange }) {
  const [localText, setLocalText] = useState(content.text ?? '');

  // 외부에서 content가 변경될 때만 동기화 (편집 모드 진입 시)
  useEffect(() => {
    setLocalText(content.text ?? '');
  }, [content.text]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setLocalText(e.target.value);          // 내부 state만 업데이트 → 이 컴포넌트만 리렌더링
    onChange({ ...content, text: e.target.value });  // 부모 ref 업데이트 → 부모 리렌더링 없음
  }

  return <textarea value={localText} onChange={handleChange} />;
}
```

**이 패턴의 장점**:
- IME 조합이 블록 컴포넌트 내부에서만 처리됨
- 부모 페이지가 리렌더링되지 않아 성능 향상
- 22종 모든 블록에 일관되게 적용

---

## 2. 잠금 세션 유지 — sessionStorage vs localStorage

### 문제

잠금 노트를 열 때마다 비밀번호를 입력해야 하면 UX가 불편합니다. 그렇다고 비밀번호를 영구 저장하면 보안에 위험합니다.

### 결정

**`sessionStorage`를 사용**하여 브라우저 세션 동안만 잠금 해제 상태를 유지합니다.

```typescript
// 잠금 해제 후 세션에 기록
sessionStorage.setItem(`note_unlocked_${noteId}`, 'true');

// 노트 접근 시 확인
const alreadyUnlocked = sessionStorage.getItem(`note_unlocked_${noteId}`) === 'true';
```

**sessionStorage를 선택한 이유 (localStorage 대비)**:

| 기준 | sessionStorage | localStorage |
|------|---------------|--------------|
| 지속성 | 탭/창 닫으면 초기화 | 브라우저 재시작 후도 유지 |
| 보안성 | 높음 (세션 종료 시 자동 삭제) | 낮음 (반영구 저장) |
| 적합한 용도 | 일시적 인증 상태 | 사용자 설정 (테마 등) |

비밀번호 자체는 저장하지 않고 "해제됨" 플래그만 저장합니다. 비밀번호는 bcrypt 해시로 DB에만 저장됩니다.

---

## 3. 완료 버튼 일괄 저장 방식

### 문제

블록 내용을 변경할 때마다 DB에 저장하는 **실시간 저장** 방식은 다음 문제가 있습니다.
- 타이핑 중 수십~수백 번의 Supabase 요청 발생 (성능/비용 문제)
- IME 조합 중 중간 상태가 DB에 저장될 수 있음
- 네트워크 오류 시 부분 저장 상태 발생 가능

### 결정

**완료 버튼 클릭 시 일괄 저장** 방식을 채택합니다.

```typescript
const pendingChanges = useRef<Record<string, Record<string, unknown>>>({});

// 변경사항 누적 (리렌더링 없음)
function handleBlockChange(blockId: string, content: Record<string, unknown>) {
  pendingChanges.current[blockId] = content;
}

// 완료 버튼 클릭 시 일괄 저장
async function handleComplete() {
  // 핵심: 먼저 로컬에 복사 후 ref를 초기화
  const changes = { ...pendingChanges.current };  // 복사 먼저!
  pendingChanges.current = {};                     // 그 다음 초기화

  // 변경된 블록만 DB 저장
  const updates = Object.entries(changes).map(([blockId, content]) =>
    supabase.from('blocks').update({ content }).eq('id', blockId)
  );
  await Promise.all(updates);
}
```

**주의사항**: `setBlocks()` 호출 직전에 `pendingChanges.current = {}`를 수행하면 `setBlocks`의 updater 함수 실행 시점에 이미 ref가 비어 있어 변경사항을 잃을 수 있습니다. 반드시 **로컬 변수로 복사 후** ref를 초기화해야 합니다.

---

## 4. 다크 모드 — dark: 클래스 미사용

### 문제

Tailwind CSS의 `dark:` 접두사 방식은 `<html>` 요소에 `dark` 클래스를 추가하는 방식입니다. 글라스모피즘 디자인에서 `rgba` 배경색과 `backdrop-filter`를 다크 모드에서 세밀하게 제어하려면 Tailwind의 `dark:` 클래스만으로는 한계가 있습니다.

### 결정

**CSS 커스텀 프로퍼티(Custom Properties, CSS Variables)** 방식을 사용합니다.

```css
/* globals.css */
:root {
  --bg-primary: rgba(240, 249, 255, 0.8);
  --text-primary: #0f172a;
  --glass-bg: rgba(255, 255, 255, 0.6);
  /* ... */
}

[data-theme="dark"] {
  --bg-primary: rgba(15, 23, 42, 0.9);
  --text-primary: #f1f5f9;
  --glass-bg: rgba(30, 41, 59, 0.6);
  /* ... */
}
```

```typescript
// ThemeProvider.tsx
function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() =>
    localStorage.getItem('theme') ?? 'light'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
}
```

**이 방식의 장점**:
- `dark:` 클래스를 모든 요소에 붙일 필요 없음 (코드 간결)
- 글라스모피즘 `rgba` 값을 테마별로 정밀 제어 가능
- 커스텀 CSS 클래스(`glass-card`, `glass-header`)와 자연스럽게 통합

---

## 5. PWA 실패 → OfflineBanner 폴백

### 시도

`next-pwa` 패키지를 사용하여 Progressive Web App으로 만들어 오프라인에서도 기본 기능을 사용할 수 있도록 시도했습니다.

### 문제

Next.js 14 App Router와 `next-pwa`의 호환성 문제로 빌드 오류가 발생했습니다. Service Worker 등록 및 캐싱 전략 설정이 App Router 구조와 맞지 않았습니다.

### 결정

**`OfflineBanner` 컴포넌트로 최소한의 오프라인 UX를 제공**합니다.

```typescript
// OfflineBanner.tsx
function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline  = () => setIsOffline(false);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online',  handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online',  handleOnline);
    };
  }, []);

  if (!isOffline) return null;
  return <div className="fixed top-0 ...">오프라인 상태입니다</div>;
}
```

**현재 한계**: 실제 오프라인 동작(캐싱, 오프라인 저장)은 지원되지 않습니다. 네트워크 상태 알림만 제공합니다. 향후 Service Worker 직접 구현으로 개선 가능합니다.

---

## 6. AI 요약 서버사이드 API Route

### 문제

Anthropic API 키(`ANTHROPIC_API_KEY`)를 클라이언트에서 직접 호출하면 브라우저 개발자 도구를 통해 API 키가 노출됩니다.

### 결정

**Next.js API Route (`/api/ai-summary/route.ts`)를 통한 서버사이드 호출**을 사용합니다.

```
클라이언트 (브라우저)
  └── POST /api/ai-summary  { content: "..." }
      └── 서버 (Next.js API Route)
          └── Anthropic API 호출 (ANTHROPIC_API_KEY 사용)
              └── { summary: "..." } 응답
```

**규칙**:
- `ANTHROPIC_API_KEY`는 `NEXT_PUBLIC_` 접두사 없이 서버 전용으로 설정
- 클라이언트 코드에서 이 변수에 직접 접근하지 않음
- API Route에서만 `process.env.ANTHROPIC_API_KEY` 참조

---

## 7. createPortal 패턴

### 문제

노트 상세 페이지에서 블록 목록 컨테이너에 `overflow: clip`이 적용되어 있습니다. 이 경우 해당 컨테이너 내부에서 렌더링되는 모달/드롭다운이 컨테이너 경계에서 잘립니다.

**증상**: 블록 내의 드롭다운 메뉴나 모달이 블록 카드 영역 밖으로 보이지 않음.

### 결정

**`ReactDOM.createPortal`을 사용**하여 모달 컴포넌트를 `document.body` 직하에 렌더링합니다.

```typescript
import { createPortal } from 'react-dom';

function Modal({ isOpen, children, onClose }) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 glass-card ...">
        {children}
      </div>
    </div>,
    document.body  // overflow-clip 컨테이너 밖으로 탈출
  );
}
```

**적용된 컴포넌트**: SearchModal, TrashModal, PasswordModal, QRModal, ChangeLogModal, MergeModal, ExportModal, BlockTransferModal, SlashCommand 등

---

## 8. Supabase 타입 never 오류

### 발생 원인

`@supabase/supabase-js`의 제네릭 타입을 사용할 때, DB 스키마를 TypeScript 타입으로 자동 생성(`supabase gen types typescript`)하지 않고 수동으로 타입을 정의하면, Supabase 클라이언트가 일부 테이블의 `Insert`/`Update` 타입을 `never`로 추론합니다.

```typescript
// 오류 예시
const { data } = await supabase.from('note_history').insert({
  note_id: id,
  message: 'test'
  // TypeScript: Argument of type '{ note_id: string; message: string; }'
  //             is not assignable to parameter of type 'never'
});
```

### 결정

**이 오류는 pre-existing(기존부터 있던) 비블로킹 오류**로 판단하고, 두 가지 중 하나로 처리합니다.

1. `// eslint-disable-next-line` 또는 `// @ts-ignore` 주석으로 억제
2. 타입 단언(type assertion) 사용: `as any`

```typescript
// 임시 해결책
await supabase.from('note_history').insert({
  note_id: noteId,
  message: reason
} as any);
```

**근본적인 해결책 (향후)**: `supabase gen types typescript --project-id [id]` 명령으로 DB 스키마에서 정확한 TypeScript 타입을 자동 생성하면 이 오류가 해소됩니다.

---

## 9. BlockType 타입 확장 이력

### v0.1.0 초기 (13종)

```typescript
type BlockType = 'text' | 'code' | 'tip' | 'steps' | 'table' |
  'checklist' | 'file' | 'keyword' | 'flow' | 'featurelist' |
  'keyvalue' | 'list' | 'credential';
```

DB 제약 조건:
```sql
CHECK (type IN ('text','code','tip','steps','table','checklist','file',
  'keyword','flow','featurelist','keyvalue','list'))
```

### v0.2.0 확장 (22종)

```typescript
type BlockType = 'text' | 'code' | 'tip' | 'steps' | 'table' |
  'checklist' | 'file' | 'keyword' | 'flow' | 'featurelist' |
  'keyvalue' | 'list' | 'credential' | 'license' | 'link' |
  'poll' | 'mindmap' | 'embed' | 'image' | 'math' | 'timer' | 'ai_summary';
```

DB 마이그레이션 (기존 제약 조건 교체):
```sql
ALTER TABLE blocks DROP CONSTRAINT IF EXISTS blocks_type_check;
ALTER TABLE blocks ADD CONSTRAINT blocks_type_check
  CHECK (type IN ('text','code','tip','steps','table','checklist','file',
    'keyword','flow','featurelist','keyvalue','list','credential','license',
    'link','poll','mindmap','embed','image','math','timer','ai_summary'));
```

**주의**: 새 블록 타입을 추가할 때는 반드시 **TypeScript 타입 정의** + **DB CHECK 제약 조건** + **블록 컴포넌트 파일** + **블록 선택 모달 목록** 네 곳을 동시에 업데이트해야 합니다.

---

## 10. 변경 이력 기록 — ConfirmDialog → SaveReasonModal

### v0.1.0

편집 완료 시 단순 `window.confirm()` 또는 기본 확인 다이얼로그로 저장 여부를 확인했습니다.

```typescript
// 구 방식
if (confirm('변경사항을 저장하시겠습니까?')) {
  await saveAll();
}
```

**문제**: 변경 이력이 남지 않아 "언제 무엇을 바꿨는지" 추적이 불가능했습니다.

### v0.2.0

**`SaveReasonModal`(변경 사유 입력 모달)을 도입**했습니다.

```
완료 버튼 클릭
  └── SaveReasonModal 표시
      ├── 변경 사유 텍스트 입력 (선택사항)
      └── 확인 버튼 클릭
          ├── 블록 변경사항 일괄 저장
          └── note_history 테이블에 사유 + 타임스탬프 INSERT
```

`ChangeLogModal`에서 이 이력을 조회하여 표시합니다.

```typescript
const { data: history } = await supabase
  .from('note_history')
  .select('*')
  .eq('note_id', noteId)
  .order('changed_at', { ascending: false });
```

---

## 11. PDF 미리보기 — data: URL 차단 우회

### 문제

파일 블록에서 PDF를 미리보기할 때, base64 인코딩된 데이터를 `data:application/pdf;base64,...` URL로 `<iframe>`에 직접 전달하면 Chrome 등 최신 브라우저에서 보안 정책으로 차단됩니다.

**오류**: `Not allowed to navigate top frame to data URL`

### 결정

**base64 데이터를 Blob으로 변환 후 `URL.createObjectURL()`로 Blob URL을 생성**합니다.

```typescript
// base64 → Blob → Object URL 변환
const base64Data = file.data.split(',')[1]; // "data:application/pdf;base64," 제거
const binaryString = atob(base64Data);
const bytes = new Uint8Array(binaryString.length);
for (let i = 0; i < binaryString.length; i++) {
  bytes[i] = binaryString.charCodeAt(i);
}
const blob = new Blob([bytes], { type: 'application/pdf' });
const blobUrl = URL.createObjectURL(blob);

// Blob URL은 브라우저 보안 정책 통과
<iframe src={blobUrl} />;

// 컴포넌트 언마운트 시 메모리 해제
useEffect(() => {
  return () => URL.revokeObjectURL(blobUrl);
}, [blobUrl]);
```

---

## 12. FileReader 이중 호출 방지

### 문제

React 18의 `StrictMode`에서는 개발 환경에서 컴포넌트가 두 번 마운트됩니다. `useState`의 updater 함수 내부에서 `FileReader`를 생성하면 StrictMode로 인해 FileReader가 두 번 실행되어 파일 데이터가 중복 저장되는 문제가 발생합니다.

### 결정

**`FileReader` 인스턴스를 `useState` updater 밖에서 생성**합니다.

```typescript
// 잘못된 패턴 (이중 호출 발생)
setFiles(prev => {
  const reader = new FileReader();  // StrictMode에서 두 번 실행됨
  reader.onload = (e) => { ... };
  reader.readAsDataURL(file);
  return [...prev, placeholder];
});

// 올바른 패턴
const reader = new FileReader();  // 밖에서 한 번만 생성
reader.onload = (e) => {
  setFiles(prev => [...prev, { data: e.target.result }]);  // updater는 데이터 추가만
};
reader.readAsDataURL(file);
```

---

## 13. pendingChanges ref 복사 순서

### 문제

`handleComplete()` 함수에서 `pendingChanges.current`를 사용하는 순서가 잘못되면 변경사항이 손실됩니다.

### 잘못된 순서 (버그)

```typescript
async function handleComplete() {
  pendingChanges.current = {};  // ❌ 먼저 초기화하면
  const changes = { ... };     //    이미 비어있음

  // setBlocks의 updater는 비동기적으로 나중에 실행됨
  // 그 시점에는 pendingChanges.current가 이미 {}
  setBlocks(prev => prev.map(b => ({
    ...b,
    content: changes[b.id] ?? b.content  // changes가 비어있어 적용 안 됨
  })));
}
```

### 올바른 순서

```typescript
async function handleComplete() {
  const changes = { ...pendingChanges.current };  // ✅ 먼저 로컬 변수로 복사
  pendingChanges.current = {};                     //    그 다음 초기화

  setBlocks(prev => prev.map(b => ({
    ...b,
    content: changes[b.id] ?? b.content  // 로컬 복사본 사용 → 정상 동작
  })));

  // DB 저장도 로컬 복사본 사용
  for (const [blockId, content] of Object.entries(changes)) {
    await supabase.from('blocks').update({ content }).eq('id', blockId);
  }
}
```

**규칙**: `pendingChanges.current`를 사용하는 함수에서는 항상 "복사 → 초기화 → 사용" 순서를 지킵니다.
