# 🌏 Smart Travel Insight Dashboard

> **Git 버전 관리 및 멀티 API 연동 과제** — 글로벌 스마트 트래블 대시보드

전 세계 도시(런던, 방콕, 다낭 등)를 검색하면 **현지 날씨 · 현지 시간(시차) · 기온별 옷차림 추천 · 구글 평점 4.0+ 검증 맛집 · 유명 관광지 · 최신 여행 영상**을 한 화면에서 보여주는 여행 준비용 대시보드입니다.

---

## 1. 기획 의도

여행을 준비할 때 우리는 보통 날씨 앱, 구글 지도, 유튜브를 **따로따로** 열어가며 정보를 조각조각 모읍니다. 이 프로젝트는 서로 다른 3개의 공공/상용 API를 **하나의 대시보드로 통합**하여, "도시 이름 하나만 검색하면 여행 준비가 끝나는 경험"을 목표로 했습니다.

또한 과제의 핵심 학습 목표에 맞춰 다음을 실습합니다.

- 서로 응답 구조가 다른 **멀티 API의 비동기(fetch) 연동**과 데이터 파싱
- `Promise.allSettled` 를 활용한 **병렬 호출** 및 부분 실패 처리 (한 API가 죽어도 나머지는 정상 표시)
- API 타임존 데이터를 이용한 **시차 계산 로직** 직접 구현
- `.gitignore` 를 활용한 **API 키 보안 관리** 및 Git 버전 관리 습관

---

## 2. 사용된 API

| API | 용도 | 핵심 데이터 |
|---|---|---|
| **OpenWeatherMap** (Current Weather) | 현재 날씨, 타임존 | 기온, 체감온도, 습도, 풍속, 날씨 상태, UTC 오프셋(초) |
| **Google Places API (New)** — `places:searchText` | 관광지 & 맛집 | 장소명, 평점, 리뷰 수, 사진, 지도 링크 |
| **YouTube Data API v3** — `search` | 최신 여행 영상 | 영상 제목, 채널명, 썸네일, 게시일 |

> Places는 브라우저에서 CORS를 지원하는 **신규(New) REST 엔드포인트**(`places.googleapis.com/v1/places:searchText`)를 사용하며, `X-Goog-FieldMask` 헤더로 필요한 필드만 요청해 **과금을 최소화**했습니다.

---

## 3. 구현 기능

1. **도시 검색** — 전 세계 도시 검색창 + 추천 도시 퀵 버튼 (런던/방콕/다낭/파리/도쿄/뉴욕)
2. **글로벌 날씨 & 시차** — OpenWeatherMap의 `timezone`(UTC 오프셋, 초)을 이용해 `현재 UTC 시각 + 오프셋`으로 현지 시각을 계산, **1초마다 갱신되는 실시간 시계** + 한국 기준 시차 안내
3. **스마트 옷차림 추천** — 기온을 8개 구간으로 나눠 아이콘/제목/설명/추천 아이템 태그를 동적 렌더링
4. **로컬 핫플레이스** — 유명 관광지 4곳 + **구글 평점 4.0 이상으로 필터링한 검증 맛집** 4곳을 사진·평점·리뷰 수와 함께 카드로 표시 (클릭 시 구글 지도 이동)
5. **트렌딩 영상** — 해당 도시의 여행 브이로그/가이드 영상 3개를 썸네일 카드로 표시 (클릭 시 유튜브 이동). **최근 6개월 이내 업로드된 영상만** 선별(`publishedAfter` 파라미터)해 최신 트렌드를 보장
6. **동적 테마** — 날씨 상태(맑음/구름/비/눈/뇌우/안개) × 낮/밤 조합에 따라 **배경 그라데이션이 부드럽게 전환** (`@property` 로 색상 값 자체를 transition)
7. **Glassmorphism UI** — `backdrop-filter: blur` 기반 유리 질감 카드, 떠다니는 블러 오브, 순차 등장 애니메이션
8. **데모 모드** — API 키가 없으면 샘플 데이터로 전체 UI가 자동 동작 (키 발급 전 확인/시연용 안전망)

---

## 4. 파일 구성 & 실행 방법

```
📁 프로젝트 루트
├── index.html          # 전체 구조 (Tailwind CDN)
├── style.css           # Glassmorphism · 동적 테마 · 애니메이션
├── script.js           # 3개 API fetch, 파싱, 시차 계산, DOM 조작
├── config.example.js   # API 키 템플릿 (커밋 O)
├── config.js           # 실제 API 키 (커밋 ❌ — .gitignore 처리)
├── .gitignore
└── README.md
```

### 실행 순서

1. `config.example.js` 를 복사해 같은 폴더에 **`config.js`** 로 저장
2. `config.js` 안의 빈 문자열에 본인의 API 키 입력

   ```js
   window.CONFIG = {
     OPENWEATHER_API_KEY: "여기에 키 입력",
     GOOGLE_PLACES_API_KEY: "여기에 키 입력",
     YOUTUBE_API_KEY: "여기에 키 입력",
   };
   ```

3. `index.html` 을 브라우저로 열기 (VS Code **Live Server** 확장 권장)
4. 키를 넣지 않으면 자동으로 **데모 모드**(샘플 데이터)로 동작합니다.

### 사전 준비 (Google Cloud Console)

- [Google Cloud Console](https://console.cloud.google.com/) → 프로젝트 생성
- **API 및 서비스 → 라이브러리**에서 다음 두 개를 **사용 설정**
  - `Places API (New)` ← ⚠️ 구버전 "Places API"가 아닌 **(New)** 버전이어야 합니다
  - `YouTube Data API v3`
- **사용자 인증 정보 → API 키 만들기**로 키 발급

---

## 5. 🔒 API 키 보안 가이드 (매우 중요!)

> 연습용 키라도 퍼블릭 저장소에 유출되면 **봇이 수 분 내에 수집해 악용**하고, Google Cloud에 결제 수단이 등록되어 있다면 **실제 금전적 손실**로 이어질 수 있습니다. 아래 3중 방어를 반드시 적용하세요.

### 5-1. 1차 방어 — 키를 아예 깃허브에 올리지 않기 (`.gitignore`)

- 실제 키는 오직 `config.js` 에만 저장하며, 이 파일은 `.gitignore` 에 등록되어 **커밋 자체가 되지 않습니다.**
- 저장소에는 키가 비어 있는 템플릿 `config.example.js` 만 올라갑니다.
- ✅ 커밋 전 확인 습관: `git status` 목록에 `config.js` 가 **없어야 정상**입니다.
- ⚠️ 이미 키를 커밋해 버렸다면? `.gitignore` 추가만으로는 **과거 커밋 기록에 키가 남습니다.** 즉시 ① 해당 키를 콘솔에서 **삭제/재발급**하고 ② 새 키로 교체하세요. (기록 세탁보다 키 폐기가 우선!)

### 5-2. 2차 방어 — HTTP 리퍼러(웹사이트) 제한

키가 유출되더라도 **내 도메인에서만 작동**하도록 잠그는 설정입니다.

1. [Google Cloud Console](https://console.cloud.google.com/) 접속 → 상단에서 프로젝트 선택
2. 왼쪽 메뉴 **API 및 서비스 → 사용자 인증 정보(Credentials)** 클릭
3. 발급받은 **API 키 이름 클릭** → 키 수정 화면 진입
4. **애플리케이션 제한사항(Application restrictions)** 에서 **`웹사이트(HTTP 리퍼러)`** 선택
5. **웹사이트 제한사항 → ADD(항목 추가)** 를 눌러 허용할 주소를 등록

   | 배포 환경 | 등록할 리퍼러 예시 |
   |---|---|
   | GitHub Pages | `https://내아이디.github.io/*` |
   | 로컬 Live Server | `http://localhost:5500/*`, `http://127.0.0.1:5500/*` |

6. **API 제한사항(API restrictions)** 에서 **`키 제한(Restrict key)`** 을 선택하고, 이 키가 쓸 API(**Places API (New)**, **YouTube Data API v3**)만 체크 → 다른 API 무단 사용 원천 차단
7. **저장** 클릭 (반영까지 최대 5분 소요)

> 💡 OpenWeatherMap 무료 키는 리퍼러 제한 기능이 없는 대신 결제 수단 미등록 시 과금이 없고, 호출 초과 시 단순 차단됩니다.

### 5-3. 3차 방어 — API 할당량(Quota) 제한으로 결제 폭탄 방지

키가 악용되더라도 **하루 사용량 자체에 상한**을 걸어 피해를 0원으로 만드는 설정입니다.

1. Google Cloud Console → **API 및 서비스 → 사용 설정된 API 및 서비스**
2. 목록에서 **Places API (New)** 클릭 → 상단 **할당량 및 시스템 한도(Quotas & System Limits)** 탭 클릭
3. `Requests per day` 등 항목 오른쪽 **연필(수정) 아이콘** 클릭
4. **할당량 한도 값을 아주 작게 수정** — 연습용이라면 `100`~`300` 정도면 충분합니다
5. **YouTube Data API v3** 도 동일하게 진입해 일일 할당량을 낮게 설정
   - 참고: YouTube API 기본 무료 할당량은 **10,000 units/일**이며, `search` 호출 1회당 **100 units**(= 하루 약 100회 검색)를 소모합니다.
6. 추가 안전장치 (강력 추천)
   - **결제(Billing) → 예산 및 알림(Budgets & alerts)** 에서 예산 `1,000원` + 50/90/100% 이메일 알림 설정
   - 연습 목적이라면 **결제 계정을 프로젝트에서 연결 해제**하는 것이 가장 확실합니다 (무료 한도 내에서만 동작하고 초과 시 그냥 에러 발생 = 과금 원천 불가)

### 5-4. 보안 체크리스트 요약

- [ ] 실제 키는 `config.js` 에만 있고, `.gitignore` 에 등록되어 있다
- [ ] `git status` 에 `config.js` 가 나타나지 않는다
- [ ] Google 키에 **HTTP 리퍼러 제한**을 걸었다
- [ ] Google 키에 **API 제한(Places (New) + YouTube만)** 을 걸었다
- [ ] **일일 할당량(Quota)** 을 낮게 제한했다
- [ ] 예산 알림을 설정했거나 결제 계정을 연결하지 않았다
- [ ] 키가 유출된 경우 즉시 **재발급**한다

---

## 6. 🚀 Vercel 배포

`config.js` 는 깃허브에 없으므로, 배포 시 **Vercel 환경 변수 → `build-config.js` → config.js 자동 생성** 방식을 사용합니다.

1. [vercel.com](https://vercel.com) 로그인 → **Add New → Project** → 이 깃허브 저장소 **Import**
2. **Environment Variables** 에 아래 3개를 등록 (Key / Value)

   | Key | Value |
   |---|---|
   | `OPENWEATHER_API_KEY` | OpenWeatherMap 키 |
   | `GOOGLE_PLACES_API_KEY` | Google 키 |
   | `YOUTUBE_API_KEY` | Google 키 (동일 키 사용 가능) |

3. **Deploy** 클릭 → 발급된 주소(`https://프로젝트명.vercel.app`) 확인
4. ⚠️ **필수**: Google Cloud Console → API 키 → HTTP 리퍼러 제한 목록에 배포 주소를 추가
   - 예: `https://프로젝트명.vercel.app/*`
   - 추가하지 않으면 배포된 사이트에서 Places/YouTube 가 403으로 차단됩니다

> 환경 변수를 수정한 뒤에는 **Deployments 탭 → 최신 배포 → Redeploy** 를 해야 반영됩니다.

---

## 7. 기술 스택

- **HTML5 + Tailwind CSS (CDN)** — 유틸리티 기반 반응형 레이아웃
- **Custom CSS** — Glassmorphism, `@property` 그라데이션 트랜지션, keyframe 애니메이션
- **Vanilla JavaScript (ES2022)** — `fetch` / `async·await` / `Promise.allSettled`, 동적 DOM 렌더링
- **Google Fonts** (Outfit, Noto Sans KR) + **FontAwesome 6**

---

*Made for the "Git 버전 관리 및 멀티 API 연동" 과제 · 2026*
