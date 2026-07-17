/* ============================================================
   Vercel 배포용 빌드 스크립트
   · config.js 는 .gitignore 로 깃허브에 올라가지 않으므로,
     배포 시 Vercel 에 등록한 '환경 변수'를 읽어 config.js 를
     자동 생성합니다. (vercel.json 의 buildCommand 에서 실행됨)
   · 로컬에서는 실행할 필요가 없습니다.
   ============================================================ */
const fs = require("fs");

const content = `window.CONFIG = {
  OPENWEATHER_API_KEY: "${process.env.OPENWEATHER_API_KEY || ""}",
  GOOGLE_PLACES_API_KEY: "${process.env.GOOGLE_PLACES_API_KEY || ""}",
  YOUTUBE_API_KEY: "${process.env.YOUTUBE_API_KEY || ""}",
};
`;

fs.writeFileSync("config.js", content);
console.log("✅ config.js 생성 완료 (환경 변수 → config.js)");

const missing = ["OPENWEATHER_API_KEY", "GOOGLE_PLACES_API_KEY", "YOUTUBE_API_KEY"]
  .filter((k) => !process.env[k]);
if (missing.length) {
  console.warn(`⚠️ 누락된 환경 변수: ${missing.join(", ")} — 해당 API는 데모 모드로 동작합니다.`);
}
