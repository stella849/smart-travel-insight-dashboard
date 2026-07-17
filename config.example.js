/* ============================================================
   ⚙️ API 키 설정 템플릿 (config.example.js)

   [사용 방법]
   1. 이 파일을 복사해서 같은 폴더에 `config.js` 라는 이름으로 저장하세요.
      (예: 탐색기에서 복사 → 붙여넣기 → 이름 변경)
   2. 아래 빈 문자열("") 안에 본인의 API 키를 붙여넣으세요.
   3. config.js 는 .gitignore 에 등록되어 있어 깃허브에 절대 올라가지 않습니다.

   ⚠️ 주의: 이 파일(config.example.js)에는 절대 실제 키를 넣지 마세요!
           실제 키는 오직 config.js 에만 넣어야 합니다.
   ============================================================ */

window.CONFIG = {
  // 🔑 OpenWeatherMap API 키 → https://home.openweathermap.org/api_keys
  OPENWEATHER_API_KEY: "", // 여기에 OpenWeatherMap 키 입력

  // 🔑 Google Cloud API 키 (Places API (New) 활성화 필요)
  //    → https://console.cloud.google.com/apis/credentials
  GOOGLE_PLACES_API_KEY: "", // 여기에 Google Places 키 입력

  // 🔑 Google Cloud API 키 (YouTube Data API v3 활성화 필요)
  //    → Places 키와 같은 키를 써도 되고, 분리해도 됩니다.
  YOUTUBE_API_KEY: "", // 여기에 YouTube Data API 키 입력
};
