/* ============================================================
   Smart Travel Insight Dashboard — script.js
   · OpenWeatherMap  : 현재 날씨 + 타임존(시차) 데이터
   · Google Places (New) : 관광지 + 평점 4.0 이상 맛집
   · YouTube Data API v3 : 최신 여행 영상
   · API 키가 없으면 자동으로 '데모 모드'(샘플 데이터)로 동작
   ============================================================ */

/* ------------------------------------------------------------
   🔑 API 키 로드
   실제 키는 config.js (window.CONFIG) 에서만 읽어옵니다.
   config.js 는 .gitignore 로 보호되어 깃허브에 올라가지 않습니다.
   ------------------------------------------------------------ */
const CONFIG = window.CONFIG || {};
const KEYS = {
  weather: (CONFIG.OPENWEATHER_API_KEY || "").trim(),
  places: (CONFIG.GOOGLE_PLACES_API_KEY || "").trim(),
  youtube: (CONFIG.YOUTUBE_API_KEY || "").trim(),
};
const isDemo = {
  weather: !KEYS.weather,
  places: !KEYS.places,
  youtube: !KEYS.youtube,
};

/* ---------- DOM 요소 ---------- */
const $ = (id) => document.getElementById(id);
const els = {
  form: $("searchForm"),
  input: $("cityInput"),
  banner: $("demoBanner"),
  loader: $("loader"),
  errorBox: $("errorBox"),
  dashboard: $("dashboard"),
  cityName: $("cityName"),
  countryName: $("countryName"),
  localTime: $("localTime"),
  localDate: $("localDate"),
  timeDiff: $("timeDiff"),
  weatherIcon: $("weatherIcon"),
  temperature: $("temperature"),
  weatherDesc: $("weatherDesc"),
  feelsLike: $("feelsLike"),
  humidity: $("humidity"),
  wind: $("wind"),
  outfitIcon: $("outfitIcon"),
  outfitTitle: $("outfitTitle"),
  outfitDesc: $("outfitDesc"),
  outfitTags: $("outfitTags"),
  travelTips: $("travelTips"),
  heroSpacer: $("heroSpacer"),
  forecast: $("forecastRow"),
  worldMap: $("worldMap"),
  attractions: $("attractionsList"),
  restaurants: $("restaurantsList"),
  videos: $("videosList"),
};

let clockTimer = null; // 현지 시간 실시간 갱신 타이머

/* ============================================================
   1) 이벤트 바인딩
   ============================================================ */
els.form.addEventListener("submit", (e) => {
  e.preventDefault();
  const city = els.input.value.trim();
  if (city) searchCity(resolveCity(city));
});

/* ============================================================
   0) 한글 검색 지원 — 도시/나라명 한글 입력 → 영문 검색어 변환
   지도 48개 도시(WORLD_CITIES) + 국적기 취항 도시 + 주요 국가명
   ============================================================ */
const CITY_ALIASES = {
  // 국내
  "부산": "Busan", "제주": "Jeju", "제주도": "Jeju", "인천": "Incheon", "대구": "Daegu",
  // 일본 (국적기 취항)
  "후쿠오카": "Fukuoka", "삿포로": "Sapporo", "나고야": "Nagoya", "오키나와": "Naha",
  "교토": "Kyoto", "히로시마": "Hiroshima", "다카마쓰": "Takamatsu", "마쓰야마": "Matsuyama",
  "가고시마": "Kagoshima", "구마모토": "Kumamoto", "미야자키": "Miyazaki", "오이타": "Oita",
  "니가타": "Niigata", "센다이": "Sendai", "나가사키": "Nagasaki", "오카야마": "Okayama",
  "시즈오카": "Shizuoka", "아사히카와": "Asahikawa",
  // 중국·대만·홍콩·마카오
  "광저우": "Guangzhou", "선전": "Shenzhen", "청두": "Chengdu", "시안": "Xi'an",
  "칭다오": "Qingdao", "옌타이": "Yantai", "웨이하이": "Weihai", "다롄": "Dalian",
  "선양": "Shenyang", "하얼빈": "Harbin", "톈진": "Tianjin", "난징": "Nanjing",
  "항저우": "Hangzhou", "우한": "Wuhan", "창사": "Changsha", "쿤밍": "Kunming",
  "마카오": "Macau", "가오슝": "Kaohsiung", "타이중": "Taichung",
  // 동남아
  "세부": "Cebu", "클락": "Angeles", "보라카이": "Boracay", "푸꾸옥": "Duong Dong", // 푸꾸옥 중심 도시 (OpenWeather 등록명)
  "나트랑": "Nha Trang", "호치민": "Ho Chi Minh City", "하이퐁": "Haiphong", "달랏": "Da Lat",
  "치앙마이": "Chiang Mai", "푸켓": "Phuket", "페낭": "Penang", "코타키나발루": "Kota Kinabalu",
  "발리": "Denpasar", "프놈펜": "Phnom Penh", "씨엠립": "Siem Reap",
  "비엔티안": "Vientiane", "루앙프라방": "Luang Prabang", "양곤": "Yangon",
  // 중앙아시아·서남아·중동
  "울란바토르": "Ulaanbaatar", "타슈켄트": "Tashkent", "알마티": "Almaty", "아스타나": "Astana",
  "비슈케크": "Bishkek", "콜롬보": "Colombo", "카트만두": "Kathmandu",
  "도하": "Doha", "아부다비": "Abu Dhabi", "텔아비브": "Tel Aviv",
  // 유럽 (추가 취항지)
  "프랑크푸르트": "Frankfurt", "뮌헨": "Munich", "밀라노": "Milan", "베네치아": "Venice",
  "리스본": "Lisbon", "부다페스트": "Budapest", "바르샤바": "Warsaw", "코펜하겐": "Copenhagen",
  "오슬로": "Oslo", "스톡홀름": "Stockholm", "헬싱키": "Helsinki", "브뤼셀": "Brussels",
  "제네바": "Geneva", "니스": "Nice",
  // 미주·대양주 (추가 취항지)
  "시애틀": "Seattle", "라스베이거스": "Las Vegas", "댈러스": "Dallas", "애틀랜타": "Atlanta",
  "보스턴": "Boston", "워싱턴": "Washington", "미니애폴리스": "Minneapolis", "디트로이트": "Detroit",
  "괌": "Hagatna", "사이판": "Saipan", "브리즈번": "Brisbane", "케언스": "Cairns", "난디": "Nadi",
  // 나라명 → 대표 도시
  "한국": "Seoul", "대한민국": "Seoul", "일본": "Tokyo", "중국": "Beijing", "대만": "Taipei",
  "태국": "Bangkok", "베트남": "Hanoi", "필리핀": "Manila", "말레이시아": "Kuala Lumpur",
  "인도네시아": "Jakarta", "인도": "Delhi", "몽골": "Ulaanbaatar", "우즈베키스탄": "Tashkent",
  "카타르": "Doha", "아랍에미리트": "Dubai", "튀르키예": "Istanbul", "터키": "Istanbul",
  "프랑스": "Paris", "영국": "London", "독일": "Berlin", "이탈리아": "Rome", "스페인": "Madrid",
  "네덜란드": "Amsterdam", "스위스": "Zurich", "오스트리아": "Vienna", "체코": "Prague",
  "그리스": "Athens", "포르투갈": "Lisbon", "헝가리": "Budapest", "폴란드": "Warsaw",
  "덴마크": "Copenhagen", "노르웨이": "Oslo", "스웨덴": "Stockholm", "핀란드": "Helsinki",
  "벨기에": "Brussels", "이집트": "Cairo", "케냐": "Nairobi", "남아공": "Cape Town",
  "미국": "New York", "캐나다": "Toronto", "멕시코": "Mexico City", "브라질": "Sao Paulo",
  "아르헨티나": "Buenos Aires", "페루": "Lima", "호주": "Sydney", "뉴질랜드": "Auckland",
};

function resolveCity(input) {
  const t = input.trim();
  // ① 지도 도시의 한글명 매칭 (서울, 런던, 다낭 …)
  const w = WORLD_CITIES.find((c) => c[0] === t);
  if (w) return w[1];
  // ② 취항 도시·나라명 별칭 매칭
  if (CITY_ALIASES[t]) return CITY_ALIASES[t];
  // ③ 그 외에는 입력 그대로 (영문 도시명 등)
  return t;
}

// 데모 모드 배너 표시 (하나라도 키가 비어 있으면 안내)
if (isDemo.weather || isDemo.places || isDemo.youtube) {
  els.banner.classList.remove("hidden");
}

/* ============================================================
   1-1) 인터랙티브 세계지도 — 주요 도시 40곳
   [한글명, 검색어(영문), 위도, 경도]
   등거리 투영: x = (경도+180)/360, y = (90-위도)/180
   ============================================================ */
const WORLD_CITIES = [
  // 아시아
  ["서울", "Seoul", 37.57, 126.98], ["도쿄", "Tokyo", 35.68, 139.69],
  ["오사카", "Osaka", 34.69, 135.5], ["베이징", "Beijing", 39.9, 116.4],
  ["상하이", "Shanghai", 31.23, 121.47], ["홍콩", "Hong Kong", 22.32, 114.17],
  ["타이베이", "Taipei", 25.03, 121.57], ["하노이", "Hanoi", 21.03, 105.85],
  ["다낭", "Da Nang", 16.05, 108.2], ["방콕", "Bangkok", 13.76, 100.5],
  ["싱가포르", "Singapore", 1.35, 103.82], ["쿠알라룸푸르", "Kuala Lumpur", 3.14, 101.69],
  ["자카르타", "Jakarta", -6.2, 106.85], ["마닐라", "Manila", 14.6, 120.98],
  ["델리", "Delhi", 28.61, 77.21], ["뭄바이", "Mumbai", 19.08, 72.88],
  ["두바이", "Dubai", 25.2, 55.27], ["이스탄불", "Istanbul", 41.01, 28.98],
  // 유럽
  ["런던", "London", 51.51, -0.13], ["파리", "Paris", 48.86, 2.35],
  ["로마", "Rome", 41.9, 12.5], ["바르셀로나", "Barcelona", 41.39, 2.17],
  ["마드리드", "Madrid", 40.42, -3.7], ["베를린", "Berlin", 52.52, 13.4],
  ["암스테르담", "Amsterdam", 52.37, 4.9], ["프라하", "Prague", 50.08, 14.44],
  ["빈", "Vienna", 48.21, 16.37], ["취리히", "Zurich", 47.38, 8.54],
  ["아테네", "Athens", 37.98, 23.73],
  // 아프리카 · 오세아니아
  ["카이로", "Cairo", 30.04, 31.24], ["케이프타운", "Cape Town", -33.92, 18.42],
  ["나이로비", "Nairobi", -1.29, 36.82], ["시드니", "Sydney", -33.87, 151.21],
  ["멜버른", "Melbourne", -37.81, 144.96], ["오클랜드", "Auckland", -36.85, 174.76],
  // 아메리카
  ["뉴욕", "New York", 40.71, -74.01], ["로스앤젤레스", "Los Angeles", 34.05, -118.24],
  ["샌프란시스코", "San Francisco", 37.77, -122.42], ["시카고", "Chicago", 41.88, -87.63],
  ["토론토", "Toronto", 43.65, -79.38], ["밴쿠버", "Vancouver", 49.28, -123.12],
  ["멕시코시티", "Mexico City", 19.43, -99.13], ["호놀룰루", "Honolulu", 21.31, -157.86],
  ["상파울루", "Sao Paulo", -23.55, -46.63], ["부에노스아이레스", "Buenos Aires", -34.6, -58.38],
  ["리우데자네이루", "Rio de Janeiro", -22.91, -43.17], ["리마", "Lima", -12.05, -77.04],
];

/* 도시별 여행 타이밍 가이드
   [가기 좋은 때, 좋은 이유, 피하면 좋은 때, 피할 이유, 축제·이벤트] */
const CITY_TIPS = {
  "Seoul": ["4~5월 · 9~10월", "벚꽃과 단풍, 쾌청한 하늘", "7~8월", "장마와 폭염이 겹침", "서울세계불꽃축제(10월) · 여의도 벚꽃축제(4월) · 서울빛초롱축제(12월)"],
  "Tokyo": ["3월 말~4월 · 11월", "벚꽃 만개와 단풍 절정", "6~8월", "장마 후 습한 무더위", "스미다가와 불꽃대회(7월) · 간다마쓰리(5월) · 메이지신궁 가을축제(11월)"],
  "Osaka": ["4~5월 · 10~11월", "온화한 날씨, 먹거리 여행 최적", "6~9월", "장마와 태풍 시즌", "텐진마쓰리(7월) · 미도스지 일루미네이션(11~12월)"],
  "Beijing": ["9~10월", "맑고 건조한 황금 가을", "3~4월 · 7~8월", "봄 황사, 여름 폭염", "춘절 묘회(1~2월) · 중추절 행사(9~10월)"],
  "Shanghai": ["3~4월 · 10~11월", "선선하고 걷기 좋은 날씨", "6~8월", "장마·폭염·태풍", "위위안 등불축제(2월) · 상하이 국제영화제(6월)"],
  "Hong Kong": ["10~12월", "건조하고 선선한 최고의 시즌", "5~9월", "습한 무더위와 태풍", "드래곤보트 축제(6월) · 윈터페스타(12월) · 구정 퍼레이드(1~2월)"],
  "Taipei": ["10~12월 · 3~4월", "더위가 꺾인 쾌적한 날씨", "6~9월", "태풍과 찜통 더위", "핑시 천등축제(2월) · 타이베이 등불축제(2월)"],
  "Hanoi": ["10~12월", "건조하고 선선한 건기", "6~8월", "폭염과 스콜성 폭우", "뗏 설날 축제(1~2월) · 중추절(9월)"],
  "Da Nang": ["2~5월", "건기, 해수욕·바나힐 최적", "9~12월", "우기와 태풍 상륙 시즌", "다낭 국제불꽃축제(6월) · 호이안 랜턴축제(매월 보름)"],
  "Bangkok": ["11~2월", "건기, 습도 낮고 화창", "4월 · 9~10월", "연중 최고 더위 / 우기 절정", "송끄란 물축제(4월) · 러이끄라통 등불축제(11월)"],
  "Singapore": ["2~4월", "강수량이 가장 적은 시기", "11~1월", "북동 몬순 소나기 잦음", "칭게이 퍼레이드(2월) · F1 나이트레이스(9월)"],
  "Kuala Lumpur": ["5~7월 · 1~2월", "비교적 건조한 시기", "10~12월", "우기, 오후 스콜", "타이푸삼(1~2월) · 하리라야 대축제(이슬람력)"],
  "Jakarta": ["5~9월", "건기, 야외 관광 수월", "12~2월", "우기, 도심 침수 잦음", "자카르타 페어(6~7월) · 독립기념일 행사(8월)"],
  "Manila": ["12~2월", "선선한 건기", "6~10월", "태풍과 우기", "시눌룩 축제(1월) · 블랙나사렛 행렬(1월)"],
  "Delhi": ["10~3월", "온화하고 관광 최적", "5~6월 · 7~9월", "45°C 폭염 / 몬순 폭우", "디왈리 빛의 축제(10~11월) · 홀리 색채축제(3월)"],
  "Mumbai": ["11~2월", "건조하고 쾌적", "6~9월", "몬순 집중호우", "가네쉬 차투르티(8~9월) · 홀리(3월)"],
  "Dubai": ["11~3월", "야외활동 가능한 '겨울'", "6~9월", "50°C에 육박하는 사막 더위", "두바이 쇼핑 페스티벌(12~1월) · 푸드 페스티벌(4~5월)"],
  "Istanbul": ["4~5월 · 9~10월", "튤립과 온화한 날씨", "7~8월", "더위와 관광 인파 절정", "이스탄불 튤립축제(4월) · 라마단 야시장(이슬람력)"],
  "London": ["5~9월", "일조량 최대, 공원 산책 최적", "11~1월", "오후 4시면 어두워지는 짧은 해", "노팅힐 카니발(8월) · 첼시 플라워쇼(5월) · 윈터원더랜드(11~12월)"],
  "Paris": ["4~6월 · 9~10월", "테라스의 계절, 쾌적한 날씨", "7~8월", "바캉스로 현지 상점 휴업 많음", "음악축제(6/21) · 파리 플라주(7~8월) · 뉘 블랑슈(10월)"],
  "Rome": ["4~6월 · 9~10월", "유적 도보 관광에 최적", "7~8월", "폭염과 인파, 긴 대기줄", "로마 건국제(4월) · 에스타테 로마나 여름축제(6~9월)"],
  "Barcelona": ["5~6월 · 9~10월", "해변과 도시 관광 모두 좋음", "8월", "폭염, 현지인 휴가로 휴업 많음", "산 조르디의 날(4/23) · 라 메르세 축제(9월)"],
  "Madrid": ["4~6월 · 9~10월", "화창하고 걷기 좋은 날씨", "7~8월", "40°C 내륙 폭염", "산 이시드로 축제(5월) · 동방박사 퍼레이드(1월)"],
  "Berlin": ["5~9월", "야외 카페·공원의 계절", "11~2월", "흐리고 우중충한 겨울", "베를리날레 영화제(2월) · 빛의 축제(10월)"],
  "Amsterdam": ["4~5월", "튤립 만개, 최고의 시즌", "11~2월", "차가운 비바람", "킹스데이(4/27) · 암스테르담 라이트 페스티벌(12~1월)"],
  "Prague": ["5~6월 · 9월", "구시가지 산책 최적", "12~2월", "영하의 혹한 (크리스마스 마켓은 매력)", "프라하의 봄 음악제(5~6월) · 크리스마스 마켓(12월)"],
  "Vienna": ["4~6월 · 9~10월", "음악·미술 관광 쾌적", "7~8월", "더위, 주요 공연 비수기", "신년음악회(1월) · 크리스마스 마켓(11~12월)"],
  "Zurich": ["6~9월", "호수 수영과 알프스 조망", "11~2월", "흐리고 해가 짧음", "스트리트 퍼레이드(8월) · 취리히 페스트(7월, 3년마다)"],
  "Athens": ["4~6월 · 9~10월", "유적 관광에 알맞은 기온", "7~8월", "그리스 폭염 주의보 단골", "아테네-에피다우로스 축제(6~8월) · 정교회 부활절(4월)"],
  "Cairo": ["10~4월", "온화한 사막의 겨울", "6~8월", "40°C 넘는 사막 더위", "아부심벨 태양축제(2/22·10/22) · 카이로 국제영화제(11~12월)"],
  "Cape Town": ["11~3월", "남반구 여름, 해변·와이너리", "6~8월", "겨울 비바람", "미니스트럴 카니발(1/2) · 케이프타운 재즈 페스티벌(3월)"],
  "Nairobi": ["6~10월", "건기, 사파리 최적기", "3~5월", "대우기, 도로 사정 악화", "마사이마라 대이동(7~10월) · 나이로비 국제무역박람회(9~10월)"],
  "Sydney": ["10~4월", "남반구 여름, 해변 시즌", "6~8월", "겨울, 해가 짧고 쌀쌀", "새해 불꽃쇼(12/31) · 비비드 시드니 빛축제(5~6월)"],
  "Melbourne": ["11~3월", "여름, 야외 이벤트 풍성", "6~8월", "하루에 사계절인 변덕 날씨", "호주오픈 테니스(1월) · 멜버른컵 경마(11월)"],
  "Auckland": ["12~3월", "뉴질랜드 여름, 아웃도어 최적", "6~8월", "비 잦은 겨울", "오클랜드 등불축제(2월) · 파시피카 축제(3월)"],
  "New York": ["4~6월 · 9~11월", "센트럴파크 봄꽃과 가을 단풍", "1~2월 · 7~8월", "혹한·폭설 / 습한 무더위", "독립기념일 불꽃(7/4) · NYC 마라톤(11월) · 록펠러 트리 점등(12월)"],
  "Los Angeles": ["5~10월", "연중 온화, 이 시기 특히 화창", "6월 초", "'준 글룸' 해무로 흐림", "아카데미 시상식(3월) · 할리우드 크리스마스 퍼레이드(11월)"],
  "San Francisco": ["8~10월", "1년 중 안개가 가장 적은 때", "6~7월", "여름인데 춥고 안개 자욱", "프라이드 퍼레이드(6월) · 플릿 위크 에어쇼(10월)"],
  "Chicago": ["6~9월", "호숫가 여름 축제 시즌", "12~2월", "'윈디시티' 칼바람 혹한", "테이스트 오브 시카고(7월) · 롤라팔루자(8월)"],
  "Toronto": ["5~9월", "쾌적한 여름, 축제 풍성", "12~2월", "영하 15°C 혹한", "캐리비안 카니발(8월) · 토론토 국제영화제(9월)"],
  "Vancouver": ["6~9월", "건조하고 맑은 최고의 여름", "11~3월", "'레인쿠버' 우기", "셀레브레이션 오브 라이트 불꽃(7~8월) · 크리스마스 마켓(11~12월)"],
  "Mexico City": ["11~4월", "건기, 맑고 선선", "6~9월", "우기, 매일 오후 소나기", "죽은 자의 날(11월 초) · 독립기념일(9월)"],
  "Honolulu": ["4~6월 · 9~11월", "쾌청 + 비수기라 한산", "12~3월", "성수기 혼잡과 높은 물가", "알로하 페스티벌(9월) · 호놀룰루 마라톤(12월)"],
  "Sao Paulo": ["3~5월 · 9~11월", "온화한 가을·봄", "12~2월", "우기 무더위", "상파울루 카니발(2월) · 프라이드 퍼레이드(6월)"],
  "Buenos Aires": ["3~5월 · 9~11월", "남미의 파리, 산책 최적기", "12~2월", "습한 무더위", "탱고 축제(8월) · 국제 도서전(4~5월)"],
  "Rio de Janeiro": ["4~6월 · 9~11월", "온화하고 화창, 한산", "1~3월", "폭염·소나기·성수기 (카니발 노린다면 감수)", "리우 카니발(2월) · 코파카바나 새해 불꽃(12/31)"],
  "Lima": ["12~4월", "해안의 여름, 드물게 맑음", "6~10월", "'가루아' 해안 안개로 연일 흐림", "페루 독립기념 축제(7월) · 세뇨르 데 로스 밀라그로스 행렬(10월)"],
};

/* 여행 타이밍 가이드 렌더링 — 좋은 때/피할 때(이유 포함) + 축제 */
function renderTravelTips(cityName) {
  // 발음기호(São 등) 제거 후 비교해 OpenWeather 도시명과 매칭
  const norm = (s) =>
    s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const key = Object.keys(CITY_TIPS).find((k) => norm(k) === norm(cityName));

  if (!key) {
    els.travelTips.innerHTML = sectionError("이 도시의 타이밍 정보는 아직 준비 중이에요. 지도의 주요 도시를 선택해 보세요!");
    return;
  }
  const [best, bestWhy, avoid, avoidWhy, fests] = CITY_TIPS[key];
  // 미니멀 디자인: 라벨과 기간을 같은 줄에 배치해 행 수를 줄이고 폰트 확대
  // (valueHtml 은 이미 이스케이프/생성된 HTML 을 받음)
  const row = (dot, label, valueHtml, why) => `
    <div class="flex items-start gap-3 py-3.5">
      <span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${dot}"></span>
      <p class="w-[5.6rem] shrink-0 pt-0.5 text-xs font-medium tracking-wide text-white/45">${label}</p>
      <div class="min-w-0">
        <div class="text-[15px] font-bold leading-snug text-white/95">${valueHtml}</div>
        ${why ? `<p class="mt-1 text-xs leading-relaxed text-white/50">${escapeHtml(why)}</p>` : ""}
      </div>
    </div>`;

  // 축제마다 '축제명 + 일정' 검색 링크 연결 → 최신 일시·장소 정보로 이동
  const festLinks = fests
    .split(" · ")
    .map((f) => {
      const name = f.replace(/\(.*?\)/g, "").trim(); // 괄호(월 정보) 제외한 축제명
      const url = `https://www.google.com/search?q=${encodeURIComponent(name + " 일정")}`;
      return `<a class="fest-link" href="${url}" target="_blank" rel="noopener noreferrer"
        title="${escapeHtml(name)} 일시·장소 검색">${escapeHtml(f)}<i class="fa-solid fa-arrow-up-right-from-square"></i></a>`;
    })
    .join("");

  els.travelTips.innerHTML = `
    <div class="divide-y divide-white/10">
      ${row("bg-emerald-300/90", "가기 좋은 때", escapeHtml(best), bestWhy)}
      ${row("bg-rose-300/90", "피하면 좋은 때", escapeHtml(avoid), avoidWhy)}
      ${row("bg-white/60", "축제 · 이벤트", `<span class="flex flex-wrap gap-x-4 gap-y-1.5">${festLinks}</span>`, "")}
    </div>`;
}

function initWorldMap() {
  els.worldMap.innerHTML = WORLD_CITIES.map(([ko, en, lat, lon]) => {
    const x = (((lon + 180) / 360) * 100).toFixed(2);
    const y = (((90 - lat) / 180) * 100).toFixed(2);
    const cls = en === "Seoul" ? "city-dot dot-seoul" : "city-dot"; // 서울은 빨간 점
    return `<button class="${cls}" style="left:${x}%;top:${y}%"
      data-city="${escapeHtml(en)}" aria-label="${ko} 날씨 검색">
      <span class="dot-label">${ko}</span>
    </button>`;
  }).join("");

  els.worldMap.addEventListener("click", (e) => {
    const dot = e.target.closest(".city-dot");
    if (!dot) return;
    els.input.value = dot.dataset.city;
    searchCity(dot.dataset.city);
  });
}
initWorldMap();

/* ============================================================
   1-2) 첫 화면 배경 — 한국을 상징하는 경복궁
   (대표 사진: 근정전 전경 가로 구도 — 배경에 적합함을 확인)
   Places 사진 API 로 불러오고, 데모 모드면 은하수 배경 유지
   ============================================================ */
(async function loadKoreaDefaultPhoto() {
  if (isDemo.places) return;
  try {
    const places = await getPlaces("경복궁", "Seoul", false, {
      lat: 37.5796, lon: 126.977,
    });
    setCityPhoto({ status: "fulfilled", value: places });
  } catch {
    /* 실패해도 은하수 그라데이션이 있으므로 무시 */
  }
})();

/* ============================================================
   2) 메인 검색 플로우 — 3개 API 병렬 호출
   ============================================================ */
async function searchCity(city) {
  showLoader();
  try {
    // ① 날씨를 먼저 받아야 도시 공식 명칭/좌표/테마를 정할 수 있음
    const weather = await getWeather(city);

    // ② 장소·영상은 서로 독립적이므로 병렬(Promise.allSettled) 호출
    const cityLabel = weather.name;
    // 도시 좌표로 locationBias 를 걸어 '다른 나라 장소가 섞이는' 문제 방지
    const [attractions, restaurants, videos, forecast] = await Promise.allSettled([
      getPlaces(`${cityLabel} 유명 관광지`, city, false, weather.coord),
      getPlaces(`${cityLabel} 맛집`, city, true, weather.coord),
      getVideos(cityLabel, city),
      getForecast(city, weather),
    ]);

    renderWeather(weather);
    renderForecast(forecast);
    renderOutfit(weather.main.temp);
    renderTravelTips(weather.name);
    renderPlaces(els.attractions, attractions, "🏛️");
    renderPlaces(els.restaurants, restaurants, "🍜");
    renderVideos(videos);

    applyTheme(weather);
    setCityPhoto(attractions); // 도시 대표 관광지 사진 → 전체 배경
    showDashboard();
  } catch (err) {
    console.error(err);
    showError(
      err.message === "NOT_FOUND"
        ? `'${escapeHtml(city)}' 도시를 찾을 수 없어요. 영문 도시명으로 다시 검색해 보세요!`
        : "데이터를 불러오지 못했어요. API 키 설정 또는 네트워크 상태를 확인해 주세요."
    );
  }
}

/* ============================================================
   3) OpenWeatherMap — 현재 날씨 + 타임존
   ============================================================ */
async function getWeather(city) {
  if (isDemo.weather) return mockWeather(city);

  const url =
    `https://api.openweathermap.org/data/2.5/weather` +
    `?q=${encodeURIComponent(city)}&units=metric&lang=kr&appid=${KEYS.weather}`;

  const res = await fetch(url);
  if (res.status === 404) throw new Error("NOT_FOUND");
  if (!res.ok) throw new Error(`Weather API 오류 (${res.status})`);

  const d = await res.json();
  return {
    name: d.name,
    coord: d.coord, // { lat, lon } — Places locationBias 에 사용
    country: d.sys.country,
    temp: undefined, // (아래 main 사용)
    main: { temp: d.main.temp, feels: d.main.feels_like, humidity: d.main.humidity },
    wind: d.wind.speed,
    desc: d.weather[0].description,
    weatherMain: d.weather[0].main, // Clear / Rain / Snow ...
    isNight: d.weather[0].icon.endsWith("n"),
    timezone: d.timezone, // UTC 기준 초 단위 오프셋
  };
}

/* ---------- 날씨 렌더링 ---------- */
function renderWeather(w) {
  els.cityName.textContent = w.name;
  els.countryName.textContent = `${countryName(w.country)} (${w.country})`;
  els.temperature.textContent = `${Math.round(w.main.temp)}°`;
  els.weatherDesc.textContent = w.desc;
  els.feelsLike.textContent = `${Math.round(w.main.feels)}°`;
  els.humidity.textContent = `${w.main.humidity}%`;
  els.wind.textContent = `${w.wind} m/s`;
  els.weatherIcon.innerHTML = weatherIconOf(w.weatherMain, w.isNight);

  startClock(w.timezone);
}

/* ---------- 현지 시간(시차) 계산 & 실시간 시계 ----------
   OpenWeatherMap 의 timezone(초 단위 UTC 오프셋)을 이용해
   '현재 UTC 시각 + 오프셋'으로 현지 시각을 계산합니다. */
function startClock(tzOffsetSec) {
  clearInterval(clockTimer);

  const tick = () => {
    const local = new Date(Date.now() + tzOffsetSec * 1000);
    // 오프셋을 더한 값을 UTC 기준으로 읽으면 곧 '현지 시각'
    const hh = String(local.getUTCHours()).padStart(2, "0");
    const mm = String(local.getUTCMinutes()).padStart(2, "0");
    const ss = String(local.getUTCSeconds()).padStart(2, "0");
    els.localTime.textContent = `${hh}:${mm}:${ss}`;

    const days = ["일", "월", "화", "수", "목", "금", "토"];
    els.localDate.textContent =
      `${local.getUTCFullYear()}년 ${local.getUTCMonth() + 1}월 ${local.getUTCDate()}일 (${days[local.getUTCDay()]})`;
  };

  // 한국(UTC+9) 기준 시차 안내
  const diffH = (tzOffsetSec - 9 * 3600) / 3600;
  const label =
    diffH === 0
      ? "한국과 시차가 없어요"
      : diffH > 0
        ? `한국보다 ${formatH(diffH)} 빨라요 ⏩`
        : `한국보다 ${formatH(-diffH)} 느려요 ⏪`;
  els.timeDiff.textContent = `🇰🇷 ${label}`;

  tick();
  clockTimer = setInterval(tick, 1000);
}

function formatH(h) {
  const whole = Math.floor(h);
  const min = Math.round((h - whole) * 60);
  return min ? `${whole}시간 ${min}분` : `${whole}시간`;
}

/* ---------- 날씨 → FontAwesome 아이콘 ---------- */
function weatherIconOf(main, night) {
  const map = {
    Clear: night ? "fa-moon" : "fa-sun",
    Clouds: night ? "fa-cloud-moon" : "fa-cloud-sun",
    Rain: "fa-cloud-showers-heavy",
    Drizzle: "fa-cloud-rain",
    Thunderstorm: "fa-cloud-bolt",
    Snow: "fa-snowflake",
    Mist: "fa-smog", Fog: "fa-smog", Haze: "fa-smog",
    Smoke: "fa-smog", Dust: "fa-smog", Sand: "fa-smog",
  };
  return `<i class="fa-solid ${map[main] || "fa-cloud"}"></i>`;
}

/* ============================================================
   3-1) 주간 날씨 — OpenWeatherMap 5일/3시간 예보를 일별로 집계
   (무료 플랜에서 제공되는 forecast 엔드포인트 사용)
   ============================================================ */
async function getForecast(city, weather) {
  if (isDemo.weather) return mockForecast(weather);

  const url =
    `https://api.openweathermap.org/data/2.5/forecast` +
    `?q=${encodeURIComponent(city)}&units=metric&lang=kr&appid=${KEYS.weather}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Forecast API 오류 (${res.status})`);
  const d = await res.json();
  const tz = d.city.timezone;

  // 3시간 간격 데이터를 '현지 날짜' 기준으로 묶어 일별 최저/최고 계산
  const byDay = {};
  d.list.forEach((item) => {
    const key = new Date((item.dt + tz) * 1000).toISOString().slice(0, 10);
    (byDay[key] = byDay[key] || []).push(item);
  });

  return Object.entries(byDay).slice(0, 6).map(([date, items]) => {
    const temps = items.map((i) => i.main.temp);
    // 대표 날씨: 현지 정오에 가장 가까운 시간대의 상태
    const rep = items.reduce((a, b) =>
      Math.abs(new Date((a.dt + tz) * 1000).getUTCHours() - 12) <=
      Math.abs(new Date((b.dt + tz) * 1000).getUTCHours() - 12) ? a : b
    );
    return {
      date,
      min: Math.round(Math.min(...temps)),
      max: Math.round(Math.max(...temps)),
      main: rep.weather[0].main,
      desc: rep.weather[0].description,
    };
  });
}

function renderForecast(settled) {
  if (settled.status === "rejected" || !settled.value.length) {
    els.forecast.innerHTML = sectionError("주간 예보를 불러오지 못했어요.");
    return;
  }
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  els.forecast.innerHTML = settled.value
    .map((f, i) => {
      const day = i === 0 ? "오늘" : days[new Date(f.date + "T00:00:00Z").getUTCDay()];
      return `
      <div class="forecast-chip" title="${escapeHtml(f.desc)}">
        <p class="fc-day">${day}</p>
        <p class="fc-icon">${weatherIconOf(f.main, false)}</p>
        <p class="fc-max">${f.max}°</p>
        <p class="fc-min">${f.min}°</p>
      </div>`;
    })
    .join("");
}

function mockForecast(weather) {
  const base = weather ? Math.round(weather.main.temp) : 21;
  const mains = [weather?.weatherMain || "Clear", "Clouds", "Clear", "Rain", "Clouds", "Clear"];
  const today = new Date();
  return mains.map((main, i) => {
    const d = new Date(today.getTime() + i * 86400000);
    return {
      date: d.toISOString().slice(0, 10),
      min: base - 3 + ((i * 2) % 3),
      max: base + 2 + (i % 3),
      main,
      desc: "샘플 예보",
    };
  });
}

/* ============================================================
   4) 스마트 옷차림 추천 (기온 구간별)
   ============================================================ */
function renderOutfit(temp) {
  const guides = [
    { min: 28, icon: "🩳", title: "한여름 초경량 룩", desc: "무더위 주의! 민소매·반팔에 통풍 잘 되는 린넨 소재를 추천해요. 자외선 차단은 필수!", tags: ["민소매", "반바지", "린넨 셔츠", "선글라스", "선크림"] },
    { min: 23, icon: "👕", title: "산뜻한 여름 룩", desc: "반팔과 얇은 셔츠면 충분해요. 저녁엔 얇은 겉옷 하나 챙기면 완벽!", tags: ["반팔티", "얇은 셔츠", "면바지", "모자"] },
    { min: 20, icon: "👔", title: "가벼운 간절기 룩", desc: "긴팔티나 가벼운 가디건이 딱 좋은 날씨예요.", tags: ["긴팔티", "가디건", "청바지"] },
    { min: 17, icon: "🧥", title: "얇은 레이어드 룩", desc: "얇은 니트나 맨투맨에 가벼운 자켓을 레이어드 해보세요.", tags: ["맨투맨", "얇은 니트", "가벼운 자켓"] },
    { min: 12, icon: "🧥", title: "자켓 필수 룩", desc: "쌀쌀해요. 자켓이나 야상, 트렌치코트를 추천해요.", tags: ["트렌치코트", "야상", "니트", "긴바지"] },
    { min: 9,  icon: "🧣", title: "포근한 코트 룩", desc: "코트에 니트를 매치하고, 얇은 목도리가 있으면 좋아요.", tags: ["코트", "히트텍", "니트", "목도리"] },
    { min: 5,  icon: "🧤", title: "겨울 방한 룩", desc: "제법 추워요! 두꺼운 코트나 가죽 자켓에 기모 제품을 더하세요.", tags: ["두꺼운 코트", "가죽 자켓", "기모 바지"] },
    { min: -Infinity, icon: "🧊", title: "혹한기 완전 무장 룩", desc: "매우 추워요! 패딩과 목도리, 장갑까지 완전 무장하세요.", tags: ["패딩", "목도리", "장갑", "기모", "핫팩"] },
  ];
  const g = guides.find((x) => temp >= x.min);

  els.outfitIcon.textContent = g.icon;
  els.outfitTitle.textContent = g.title;
  els.outfitDesc.textContent = `현재 ${Math.round(temp)}°C — ${g.desc}`;
  els.outfitTags.innerHTML = g.tags
    .map((t) => `<span class="glass-chip rounded-full px-3 py-1 text-xs text-white/85">#${t}</span>`)
    .join("");
}

/* ============================================================
   5) Google Places API (New) — 관광지 & 평점 4.0+ 맛집
   POST places:searchText (브라우저 CORS 지원 엔드포인트)
   ============================================================ */
async function getPlaces(query, city, restaurantOnly = false, coord = null) {
  if (isDemo.places) return mockPlaces(city, restaurantOnly);

  const body = { textQuery: query, languageCode: "ko", maxResultCount: 10 };
  // ⚠️ locationBias 가 없으면 요청자 IP(한국) 기준으로 결과가 편향되어
  //    다른 나라 검색에 한국 장소가 섞일 수 있음 → 도시 좌표 반경 50km 로 고정
  if (coord) {
    body.locationBias = {
      circle: { center: { latitude: coord.lat, longitude: coord.lon }, radius: 50000 },
    };
  }

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": KEYS.places,
      // FieldMask: 필요한 필드만 요청 → 과금 최소화 & 응답 최적화
      "X-Goog-FieldMask":
        "places.displayName,places.rating,places.userRatingCount,places.photos,places.googleMapsUri",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Places API 오류 (${res.status})`);

  const data = await res.json();
  let places = (data.places || []).map((p) => ({
    name: p.displayName?.text || "이름 없음",
    rating: p.rating || 0,
    reviews: p.userRatingCount || 0,
    photoName: p.photos?.[0]?.name || null, // 배경용 고해상도 요청에 재사용
    photo: p.photos?.[0]?.name
      ? `https://places.googleapis.com/v1/${p.photos[0].name}/media?maxWidthPx=200&key=${KEYS.places}`
      : null,
    url: p.googleMapsUri || "#",
  }));

  // ⭐ 맛집은 '구글 평점 4.0 이상'만 검증된 리스트로 필터링
  if (restaurantOnly) places = places.filter((p) => p.rating >= 4.0);

  return places.slice(0, 4);
}

/* ---------- 장소 카드 렌더링 (allSettled 결과 처리) ---------- */
function renderPlaces(container, settled, fallbackEmoji) {
  if (settled.status === "rejected") {
    container.innerHTML = sectionError("장소 정보를 불러오지 못했어요.");
    return;
  }
  const list = settled.value;
  if (!list.length) {
    container.innerHTML = sectionError("조건에 맞는 장소가 없어요.");
    return;
  }

  container.innerHTML = list
    .map(
      (p) => `
      <a class="place-item" href="${escapeHtml(p.url)}" target="_blank" rel="noopener noreferrer">
        ${
          p.photo
            ? `<img class="place-thumb" src="${escapeHtml(p.photo)}" alt="${escapeHtml(p.name)}" loading="lazy"
                 onerror="this.outerHTML='<div class=&quot;place-thumb place-thumb-fallback&quot;>${fallbackEmoji}</div>'" />`
            : `<div class="place-thumb place-thumb-fallback">${fallbackEmoji}</div>`
        }
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-bold">${escapeHtml(p.name)}</p>
          <p class="mt-0.5 flex items-center gap-1.5 text-xs text-white/70">
            <span class="stars">${starBar(p.rating)}</span>
            <b class="text-white">${p.rating ? p.rating.toFixed(1) : "-"}</b>
            <span class="text-white/45">리뷰 ${p.reviews.toLocaleString()}개</span>
          </p>
        </div>
        <i class="fa-solid fa-chevron-right text-xs text-white/40"></i>
      </a>`
    )
    .join("");
}

function starBar(rating) {
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(Math.max(0, 5 - full));
}

/* ============================================================
   6) YouTube Data API v3 — 최신 여행 영상
   ============================================================ */
async function getVideos(cityLabel, city) {
  if (isDemo.youtube) return mockVideos(city);

  // 📅 선별 기준: 최근 6개월 이내 업로드된 영상만 (publishedAfter, RFC3339)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const url =
    `https://www.googleapis.com/youtube/v3/search` +
    `?part=snippet&type=video&maxResults=10&safeSearch=moderate` +
    `&q=${encodeURIComponent(cityLabel + " 여행 브이로그")}` +
    `&publishedAfter=${encodeURIComponent(sixMonthsAgo.toISOString())}` +
    `&relevanceLanguage=ko&key=${KEYS.youtube}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube API 오류 (${res.status})`);

  const data = await res.json();
  const items = (data.items || []).map((v) => ({
    id: v.id.videoId,
    title: v.snippet.title,
    desc: v.snippet.description || "",
    channel: v.snippet.channelTitle,
    thumb: v.snippet.thumbnails?.medium?.url || null,
    date: v.snippet.publishedAt?.slice(0, 10) || "",
  }));

  // 🎯 관련도 검색이 다른 도시 영상을 섞는 문제 방지:
  //    제목/설명에 도시명(영문 or 한글)이 실제로 포함된 영상만 선별
  const koName = (WORLD_CITIES.find(
    (c) => c[1].toLowerCase() === cityLabel.toLowerCase()
  ) || [])[0];
  const mentionsCity = (v) => {
    const text = `${v.title} ${v.desc}`.toLowerCase();
    return text.includes(cityLabel.toLowerCase()) || (koName && text.includes(koName));
  };
  const filtered = items.filter(mentionsCity);

  // 필터 결과가 너무 적으면(1개 이하) 원본 순위로 보완
  return (filtered.length >= 2 ? filtered : items).slice(0, 3);
}

function renderVideos(settled) {
  if (settled.status === "rejected") {
    els.videos.innerHTML = `<div class="sm:col-span-3">${sectionError("영상을 불러오지 못했어요.")}</div>`;
    return;
  }
  const list = settled.value;
  if (!list.length) {
    els.videos.innerHTML = `<div class="sm:col-span-3">${sectionError("관련 영상이 없어요.")}</div>`;
    return;
  }

  els.videos.innerHTML = list
    .map(
      (v) => `
      <a class="video-card glass-card"
         href="${v.id ? `https://www.youtube.com/watch?v=${encodeURIComponent(v.id)}` : escapeHtml(v._url || "#")}"
         target="_blank" rel="noopener noreferrer">
        <div class="thumb-wrap">
          ${
            v.thumb
              ? `<img src="${escapeHtml(v.thumb)}" alt="" loading="lazy" />`
              : `<div class="grid h-full w-full place-items-center text-4xl text-white/50"><i class="fa-brands fa-youtube"></i></div>`
          }
          <span class="play-badge"><i class="fa-solid fa-circle-play"></i></span>
        </div>
        <div class="p-4">
          <p class="line-clamp-2 text-sm font-bold leading-snug">${escapeHtml(v.title)}</p>
          <p class="mt-2 text-xs text-white/60">
            <i class="fa-solid fa-user mr-1"></i>${escapeHtml(v.channel)}
            <span class="mx-1.5 text-white/30">·</span>${v.date}
          </p>
        </div>
      </a>`
    )
    .join("");
}

/* ============================================================
   7) 도시 대표 사진 배경 — Places 관광지 1위 사진을 고해상도로
   받아 전체 배경에 크로스페이드로 적용 (Ken Burns 효과 포함)
   ============================================================ */
function setCityPhoto(settled) {
  const el = document.getElementById("bgPhoto");
  const first =
    settled.status === "fulfilled" ? settled.value.find((p) => p.photoName) : null;

  if (!first) {
    // 사진이 없으면(데모 모드 등) 서서히 걷어내고 그라데이션만 노출
    el.classList.remove("visible");
    return;
  }

  const url = `https://places.googleapis.com/v1/${first.photoName}/media?maxWidthPx=1920&key=${KEYS.places}`;
  const img = new Image();
  img.onload = () => {
    el.classList.remove("visible");
    // 페이드아웃 후 새 사진으로 교체 → 페이드인 (크로스페이드 느낌)
    setTimeout(() => {
      el.style.backgroundImage = `url("${url}")`;
      el.classList.add("visible");
    }, 150);
  };
  img.src = url;
}

/* ============================================================
   7-1) 동적 배경 테마 — 날씨 상태 + 낮/밤
   ============================================================ */
function applyTheme(w) {
  const groupMap = {
    Clear: "clear", Clouds: "clouds",
    Rain: "rain", Drizzle: "rain",
    Snow: "snow", Thunderstorm: "thunder",
  };
  const group = groupMap[w.weatherMain] || "mist";
  const theme = `theme-${group}-${w.isNight ? "night" : "day"}`;

  document.body.className = document.body.className
    .split(" ")
    .filter((c) => !c.startsWith("theme-"))
    .concat(theme)
    .join(" ");
}

/* ============================================================
   8) UI 상태 (로더 / 에러 / 대시보드)
   ============================================================ */
function showLoader() {
  els.loader.classList.remove("hidden");
  els.errorBox.classList.add("hidden");
  els.dashboard.classList.add("hidden");
  els.heroSpacer.classList.add("hidden"); // 검색 시작 시 첫 화면 여백 제거
}
function showDashboard() {
  els.loader.classList.add("hidden");
  els.dashboard.classList.remove("hidden");
  // 카드 등장 애니메이션 재생을 위해 리플로우 트리거
  els.dashboard.querySelectorAll(".card-enter").forEach((el) => {
    el.style.animation = "none";
    void el.offsetHeight;
    el.style.animation = "";
  });
}
function showError(msg) {
  els.loader.classList.add("hidden");
  els.errorBox.innerHTML = `<i class="fa-solid fa-triangle-exclamation mr-1"></i> ${msg}`;
  els.errorBox.classList.remove("hidden");
}
function sectionError(msg) {
  return `<div class="rounded-2xl bg-white/5 px-4 py-6 text-center text-xs text-white/50">
    <i class="fa-solid fa-circle-info mr-1"></i>${msg}</div>`;
}

/* ---------- 유틸 ---------- */
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function countryName(code) {
  try {
    return new Intl.DisplayNames(["ko"], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
}

/* ============================================================
   9) 데모 모드 — 샘플(목업) 데이터
   API 키 발급 전에도 전체 UI/UX 를 확인할 수 있습니다.
   ============================================================ */
const MOCK_DB = {
  london:   { name: "London",   country: "GB", tz: 3600,   temp: 17, main: "Rain",   night: false, desc: "가벼운 비" },
  bangkok:  { name: "Bangkok",  country: "TH", tz: 25200,  temp: 33, main: "Clear",  night: false, desc: "맑음" },
  "da nang":{ name: "Da Nang",  country: "VN", tz: 25200,  temp: 30, main: "Clouds", night: false, desc: "구름 조금" },
  paris:    { name: "Paris",    country: "FR", tz: 7200,   temp: 22, main: "Clear",  night: false, desc: "맑음" },
  tokyo:    { name: "Tokyo",    country: "JP", tz: 32400,  temp: 27, main: "Clouds", night: true,  desc: "흐림" },
  "new york":{ name: "New York", country: "US", tz: -14400, temp: 24, main: "Thunderstorm", night: true, desc: "뇌우" },
};

function mockWeather(city) {
  const m = MOCK_DB[city.toLowerCase()] ||
    { name: city, country: "UN", tz: 0, temp: 21, main: "Clear", night: false, desc: "맑음 (샘플)" };
  return {
    name: m.name,
    country: m.country,
    main: { temp: m.temp, feels: m.temp - 1, humidity: 62 },
    wind: 3.4,
    desc: m.desc + " · 샘플",
    weatherMain: m.main,
    isNight: m.night,
    timezone: m.tz,
  };
}

const MOCK_PLACES = {
  london: {
    spots: ["빅벤 & 국회의사당", "런던아이", "타워 브리지", "대영박물관"],
    foods: ["Dishoom Covent Garden", "Flat Iron Steak", "Padella", "The Ivy"],
  },
  bangkok: {
    spots: ["왓 아룬 (새벽 사원)", "왓 포", "카오산 로드", "짜뚜짝 주말시장"],
    foods: ["Jay Fai", "Thipsamai Pad Thai", "Somtum Der", "Err Urban Rustic Thai"],
  },
  "da nang": {
    spots: ["바나힐 골든브릿지", "미케 비치", "오행산", "다낭 대성당"],
    foods: ["Madame Lan", "Bep Hen", "Mi Quang 1A", "Banh Xeo Ba Duong"],
  },
  default: {
    spots: ["구시가지 광장", "전망 타워", "국립 박물관", "센트럴 파크"],
    foods: ["로컬 누들 하우스", "미슐랭 비스트로", "올드타운 그릴", "리버뷰 카페"],
  },
};

function mockPlaces(city, restaurantOnly) {
  const db = MOCK_PLACES[city.toLowerCase()] || MOCK_PLACES.default;
  const names = restaurantOnly ? db.foods : db.spots;
  return names.map((name, i) => ({
    name: `${name} (샘플)`,
    rating: [4.8, 4.6, 4.4, 4.1][i],
    reviews: [12840, 8532, 5210, 3106][i],
    photo: null,
    url: "https://www.google.com/maps/search/" + encodeURIComponent(name + " " + city),
  }));
}

function mockVideos(city) {
  const searchUrl = (q) => "https://www.youtube.com/results?search_query=" + encodeURIComponent(q);
  return [
    { id: "", title: `🌏 ${city} 여행 브이로그 — 3박 4일 완벽 코스 (샘플)`, channel: "여행하는 스텔라", thumb: null, date: "2026-07-10" },
    { id: "", title: `${city} 맛집 TOP 5, 현지인이 알려주는 찐 리스트 (샘플)`, channel: "푸드트립", thumb: null, date: "2026-07-05" },
    { id: "", title: `${city} 여행 전 꼭 봐야 할 꿀팁 총정리 (샘플)`, channel: "트래블 가이드", thumb: null, date: "2026-06-28" },
  ].map((v) => ({ ...v, id: v.id, _url: searchUrl(`${city} 여행`) }));
}
