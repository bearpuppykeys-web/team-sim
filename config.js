// Apps Script를 배포한 뒤 받은 "웹 앱 URL"을 따옴표 안에 넣으세요.
// 비워 두거나 주소 끝에 ?demo 를 붙이면 저장·AI 없이 시험하는 데모 모드로 열립니다.
window.TEAM_SIM_CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbysJ-rzqEDIcQmileIt5aT-hTGZhFWWoMmT3-h4bQcs4wtmVmWClaByaLyyyMAif4YS/exec",

  // 조별 시나리오 카드 (Google 문서 링크, 공유: 링크가 있는 모든 사용자 - 편집자)
  // 비워 둔 조는 원본 시나리오 카드(Claude 문서)가 열립니다.
  CARD_URLS: {
    g1: "https://docs.google.com/document/d/1Q39b8L4UQkAvYqJG30QyH0cGR-awBLQd0OBNIYeeW90/edit",   // 1조
    g2: "https://docs.google.com/document/d/1utnqsNr5dvt5TvN0XP4EBPE2PyNpXFXXqqynFwSo9cQ/edit",   // 2조
    g3: "https://docs.google.com/document/d/1G0T_LTGkk34tbFmNMDh4S8EoAmd6Qsg82iIANfvYfCw/edit"    // 3조
  }
};
