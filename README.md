# 📋 HD2Lab | Todo Master

[HD2Lab Server HQ](https://hd2lab.duckdns.org)의 디자인 시스템 및 감성을 담은 정적 웹(Static SPA) 기반의 할 일 관리 애플리케이션입니다.

- **🌐 Live Demo**: [https://hyangdan2.github.io/AGPilot0002/](https://hyangdan2.github.io/AGPilot0002/)
- **🏛️ HD2Lab Hub**: [https://hd2lab.duckdns.org](https://hd2lab.duckdns.org)

---

## ✨ 디자인 & 테마 특징 (HD2Lab Signature)
- **HD2Lab 테마 팔레트**: 
  - 기본 배경 `#101110`, 서브 패널 `#1b1d19`, 경계선 `#30322d`
  - 시그니처 오렌지/코랄 악센트 `#ff824f`
  - 올리브/세이지 그린 서브 악센트 `#82916c`
- **시그니처 브랜딩**: HD2Lab Skew 마크, Eyebrow 태그, 모노스페이스 디테일
- **에셋 구성**:
  - `favicon.svg`, `favicon-32x32.png`, `apple-touch-icon.png` (HD2Lab 정체성 반영)
  - `og-image.png` / `social-preview.png` (1200x630 SNS 소셜 미리보기 썸네일)
- **오픈그래프(OG) & 트위터 카드 메타 태그** 적용

---

## ⚡ 주요 기능
- **할 일 CRUD**: 생성, 상태 토글(완료/미완료), 인라인 수정, 개별 및 일괄 삭제
- **카테고리 & 우선순위**: 개인, 업무, 공부, 쇼핑, 기타 + 3단계 우선순위
- **마감일 관리**: 마감일 D-Day 계산 및 임박/초과 상태 뱃지
- **필터 & 검색 & 정렬**: 실시간 검색, 카테고리 필터, 상태별 탭, 다중 정렬
- **통계 대시보드**: 진행률 실시간 프로그레스 바 및 카운터
- **로컬 스토리지 자동 저장 & JSON 백업/복원**
- **다크/라이트 모드 지원**: 기본 다크 모드 탑재

---

## 🛠️ 실행 및 배포
별도의 빌드 없이 브라우저에서 바로 열거나 정적 웹 호스팅(GitHub Pages)에 배포할 수 있습니다.

```bash
# 로컬 웹 서버 실행 예시
python3 -m http.server 8080
```
