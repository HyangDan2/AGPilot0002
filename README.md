# 📋 HD2Lab | Todo Master (v2.1.0 Production)

[HD2Lab Server HQ](https://hd2lab.duckdns.org)의 브랜드 아이덴티티와 고유 디자인 시스템을 계승한 프로덕션 등급의 정적 웹(Static SPA) 할 일 관리 애플리케이션입니다.

- **🌐 Live Demo**: [https://hyangdan2.github.io/AGPilot0002/](https://hyangdan2.github.io/AGPilot0002/)
- **🏛️ HD2Lab Hub**: [https://hd2lab.duckdns.org](https://hd2lab.duckdns.org)

---

## ✨ 핵심 기능 (Features)

### 1. 생산성 및 작업 관리
- **스마트 작업 입력 (Smart Input)**: 자연어 토큰 분석 엔진 탑재. 예: `내일 회의 #업무 !높음 매주` 입력 시 마감일, 카테고리, 우선순위, 반복 주기를 자동 추출하고 실시간 프리뷰 배지 제공 (규칙 기반 순수 로컬 알고리즘, 외부 API 의존성 없음).
- **오늘 포커스 모드 (Today Focus Mode)**: 오늘 마감 작업, 지연된 작업, 높은 우선순위 작업을 집중해서 관리할 수 있는 `🎯 오늘 포커스` 탭 제공.
- **할 일 CRUD & 인라인/모달 상세 편집**: 
  - 빠른 제목 수정을 위한 인라인 편집 (더블클릭 또는 ✏️ 버튼).
  - 마감일, 카테고리, 우선순위, 반복 주기, 세부 항목까지 한 번에 관리하는 상세 수정 모달 (⚙️ 버튼).
- **다중 실행 취소 (Multi-Delete Undo)**: 연속으로 여러 작업을 삭제하거나 완료 항목 일괄 삭제 시에도 각각의 삭제 작업에 대한 독립적인 실행 취소(Undo) 지원.
- **세부 항목 (Subtasks)**: 작업별 하위 체크리스트 생성, 완료 토글 및 실시간 진행률 `(2/3)` 표시.
- **반복 작업 (Recurring Tasks)**: `매일`, `매주`, `매월` 주기 설정 가능. 완료 시 다음 회차 작업 자동 예약 생성 및 완료 실행 취소 시 자동 롤백 지원.
- **우선순위 & 카테고리**: 3단계 우선순위(🔥 높음, ⚡ 보통, 🌱 낮음) 및 카테고리(개인, 업무, 공부, 쇼핑, 기타) 태깅.
- **마감일 & D-Day 엔진**: 로컬 타임존 기반 정확한 D-Day 계산(오늘 마감, 내일 마감, D-N, 지연일 표시) 및 말일/윤년 처리.
- **완료 일시 기록**: 작업 완료 시 타임스탬프(`✓ 2026-11-06 02:00 완료`) 자동 기록.

### 2. 탐색 & 사용자 경험 (UX)
- **컨텍스트 뷰 탭**: `🎯 오늘 포커스`, `전체`, `오늘`, `예정`, `지연`, `진행 중`, `완료됨` 7개 전용 뷰 탭 제공.
- **드래그 앤 드롭 & 키보드 순서 변경**: HTML5 드래그 핸들(`⋮⋮`) 및 키보드/터치 지원 화살표 버튼(`↑`, `↓`)을 통한 자유로운 수동 정렬.
- **실시간 검색 & 다중 정렬**: 제목 및 세부 항목까지 아우르는 실시간 검색, 최신순/마감일순/우선순위순 정렬.
- **반응형 모바일 퍼스트**: 320px(최소 모바일), 375px, 390px, 768px(태블릿), 데스크톱 전 구간 가로 스크롤 없는 완벽한 레이아웃 및 WCAG 2.2 AA 터치 타깃 준수.

### 3. 데이터 무결성 & 신뢰성
- **스토리지 실패 감지 및 롤백**: 브라우저 스토리지 할당량 초과 시 사용자 피드백 안내 및 `rollbackToLastPersisted()` 안전 롤백.
- **버전 2.1 백업 스키마 & 중복 분석**: 미래 버전 차단, 5,000개 수량 한도 보호, 복원 전 **신규 / 중복 / 무효 항목 분석** 및 안전 병합.
- **레거시 하위 호환성**: `todo_master_items_v1` 및 v1/v2 백업 파일 100% 무손실 마이그레이션.

### 4. 접근성 & PWA & CI
- **웹 접근성 (a11y)**: 프로그레스 바 `aria-valuenow` 실시간 동기화, `role="checkbox"`, `aria-checked`, 스크린 리더용 라이브 영역, 키보드 포커스 트랩.
- **단축키 지원**: `N`(새 작업 포커스), `T`(테마 전환), `?`(단축키 도움말), `Space/Enter`(체크 토글), `Esc`(취소).
- **오프라인 PWA**: `manifest.json` 및 `sw.js` Service Worker 탑재로 오프라인 구동 및 모바일 홈 화면 설치 지원.
- **CI 자동화**: GitHub Actions 기반 풀 테스트 스위트 (단위 테스트 + E2E) 자동 검증.

---

## 🛠️ 기술 스택 및 아키텍처

- **Runtime**: Vanilla JavaScript (ES Modules, Modern ES2022+), Semantic HTML5, Modern CSS (Custom Properties)
- **Zero Heavy Frameworks**: React, Vue, 빌드 툴 없이 브라우저 네이티브 기술로만 동작
- **Testing**: Node.js Native Test Runner (`node:test`, `node:assert`), Playwright Browser E2E Runner
- **Hosting**: GitHub Pages

자세한 구조는 [ARCHITECTURE.md](file:///Users/jaehyukshim/AGWS/AGPilot0002/ARCHITECTURE.md)를 참고하세요.

---

## 🧪 자동화 테스트 실행 방법

### 1. 단위 테스트 (Unit Tests)
Node.js 내장 테스트 러너를 사용해 외부 의존성 없이 즉시 실행됩니다:
```bash
npm run test:unit
```
*(총 27개 테스트: 모델, 날짜 엔진, XSS 보안, 로컬 스토리지 마이그레이션, 백업 스키마, 상태 스토어)*

### 2. 브라우저 E2E 테스트 (Playwright)
실제 크로미움 브라우저 환경 및 다양한 모바일 뷰포트에서 실행됩니다:
```bash
npm run test:e2e
```
*(총 17개 테스트: 전체 CRUD, 인라인 수정, 서브태스크, 삭제 취소 토스트, 테마 전환, 뷰 탭, 320px~1200px 반응형 검증, 단축키 및 접근성)*

### 3. 전체 테스트 일괄 실행
```bash
npm test
```

---

## 🚀 로컬 실행 방법

별도의 번들링이나 빌드 과정 없이 정적 웹 서버로 즉시 실행할 수 있습니다:
```bash
python3 -m http.server 8080
# 또는
npx serve .
```
브라우저에서 `http://localhost:8080`으로 접속합니다.
