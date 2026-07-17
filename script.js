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
  quick: $("quickCities"),
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
  if (city) searchCity(city);
});

els.quick.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-city]");
  if (!btn) return;
  els.input.value = btn.dataset.city;
  searchCity(btn.dataset.city);
});

// 데모 모드 배너 표시 (하나라도 키가 비어 있으면 안내)
if (isDemo.weather || isDemo.places || isDemo.youtube) {
  els.banner.classList.remove("hidden");
}

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
    const [attractions, restaurants, videos] = await Promise.allSettled([
      getPlaces(`${cityLabel} 유명 관광지`, city),
      getPlaces(`${cityLabel} 맛집`, city, true),
      getVideos(cityLabel, city),
    ]);

    renderWeather(weather);
    renderOutfit(weather.main.temp);
    renderPlaces(els.attractions, attractions, "🏛️");
    renderPlaces(els.restaurants, restaurants, "🍜");
    renderVideos(videos);

    applyTheme(weather);
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
async function getPlaces(query, city, restaurantOnly = false) {
  if (isDemo.places) return mockPlaces(city, restaurantOnly);

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": KEYS.places,
      // FieldMask: 필요한 필드만 요청 → 과금 최소화 & 응답 최적화
      "X-Goog-FieldMask":
        "places.displayName,places.rating,places.userRatingCount,places.photos,places.googleMapsUri",
    },
    body: JSON.stringify({ textQuery: query, languageCode: "ko", maxResultCount: 10 }),
  });
  if (!res.ok) throw new Error(`Places API 오류 (${res.status})`);

  const data = await res.json();
  let places = (data.places || []).map((p) => ({
    name: p.displayName?.text || "이름 없음",
    rating: p.rating || 0,
    reviews: p.userRatingCount || 0,
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

  const url =
    `https://www.googleapis.com/youtube/v3/search` +
    `?part=snippet&type=video&maxResults=3&safeSearch=moderate` +
    `&q=${encodeURIComponent(cityLabel + " 여행 브이로그")}` +
    `&relevanceLanguage=ko&key=${KEYS.youtube}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube API 오류 (${res.status})`);

  const data = await res.json();
  return (data.items || []).map((v) => ({
    id: v.id.videoId,
    title: v.snippet.title,
    channel: v.snippet.channelTitle,
    thumb: v.snippet.thumbnails?.medium?.url || null,
    date: v.snippet.publishedAt?.slice(0, 10) || "",
  }));
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
   7) 동적 배경 테마 — 날씨 상태 + 낮/밤
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
