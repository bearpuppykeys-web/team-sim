/* 팀 시뮬레이션 공용 코드: 서버 연결(또는 데모), 시나리오 형식, 술기 체크리스트, 프롬프트, 고정 디브리핑, 보고서 초안
   사례·술기: 술기평가 CPX work sheet (3학년 2학기용, 뇌수술환자 신경계사정)
   디브리핑·자기성찰·간호기록지·SBAR: 성인간호 신경계 시뮬레이션 실습보고서 양식 */
(function(){
  const CFG = window.TEAM_SIM_CONFIG || {};
  const DEMO = !CFG.API_URL || /[?&]demo\b/.test(location.search);
  const AI_ON = CFG.AI !== false;   // config.js AI: false → AI 없이 진행

  // 날짜별 모드: 11/12(목)이면 목요일 모드 (IICP 악화). 확인용: 주소에 ?day=thu 또는 ?day=wed, ?now=2026-11-12T13:10
  const THU_DATE = "2026-11-12";
  const IS_THU = (function(){
    const q = location.search;
    if (/[?&]day=thu\b/.test(q)) return true;
    if (/[?&]day=wed\b/.test(q)) return false;
    const nq = (/[?&]now=([\d\-T:]+)/.exec(q) || [])[1];
    const d = nq && !isNaN(new Date(nq)) ? new Date(nq) : new Date();
    const p = n => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + p(d.getMonth()+1) + "-" + p(d.getDate()) === THU_DATE;
  })();
  const DAY = IS_THU ? "thu" : "wed";

  // 상황지침 (work sheet)
  const CASE_WED = {
    short: "75/M · 개두술·혈종제거술 후 · 신경계중환자실 · 기관내 삽관",
    text: "75세 김길동님은 당뇨병으로 인슐린으로 조절을 하던 중 술에 취해 계단에서 넘어지면서 머리를 부딪쳐 119에 의해 응급실로 이송되었다. 경막내출혈을 진단받고 Craniotomy와 혈종제거술을 받고 신경계 중환자실로 전동되었다. 환자의 왼쪽 손에는 정맥 주사통로가 확보되어 있고 NS 1L가 연결되어 있다. 김길동님은 현재 기관내 삽관 상태이다. 환자의 수술 후 신경계 초기 사정과 중재를 시작하시오. 환자를 위한 치료적 중재 중 낙상과 욕창예방을 위한 간호를 실시하십시오. 마지막으로 처방된 인슐린을 투여하는 간호중재를 시행하십시오."
  };
  // 목요일 상황지침 (교육용 초안, 교수님 확인): 같은 환자, 수술 후 1일째 IICP 악화
  const CASE_THU = {
    short: "75/M · 개두술·혈종제거술 후 1일째 · IICP 악화 · 기관내 삽관",
    text: "75세 김길동님은 어제 경막내출혈로 Craniotomy와 혈종제거술을 받고 신경계 중환자실에서 치료 중이다(수술 후 1일째). 기관내 삽관 상태로 기계환기 중이며, 왼쪽 손의 정맥 주사통로로 NS 1L가 들어가고 있다. 밤사이 안정적이었으나 새벽부터 두통을 호소하였고 1회 구토하였다. 아침 정규 사정 시간이다. 환자의 신경계를 재사정하고 어제 기록과 비교하시오. 두개내압 상승(IICP) 징후를 발견하면 팀에 알리고 의사에게 SBAR로 보고한 뒤, 처방에 따라 중재하고 다시 사정하시오."
  };
  const CASE = IS_THU ? CASE_THU : CASE_WED;

  // 학교 자료 기준 (교내자율실습 폴더: "BST 오더지_RI sliding scale.pdf", "욕창 및 낙상_측정도구.pdf")
  const REF = {
    order: "의사진료지시서(신경외과 전문의 이익준): 등록번호 0123456 · DMLD 2000kcal L-tube 통해 식이 · V/S check q 1hr, GCS·pupil reflex 확인 · BST 4/day 식사 전 · IICP 증상·ICP 상승 여부 확인 · L-tube 삽입 11AM · 인슐린 치료 RI Sliding 시작",
    ri: "151–200 mg/dL → RI 2U / 201–250 mg/dL → RI 4U / 251–300 mg/dL → RI 6U / 301–350 mg/dL → RI 8U / 351–400 mg/dL → RI 10U",
    braden: "Braden Scale 6영역(감각지각 1~4, 피부습기 1~4, 활동상태 1~4, 가동성 1~4, 영양섭취 1~4, 피부마찰과 쓸림 1~3) · 점수가 낮을수록 위험: 저위험군 15~18점, 중위험군 13~14점, 고위험군 10~12점, 초고위험군 9점 이하",
    morse: "Morse Fall Scale: 과거 낙상 경험(3개월 이내) 없음 0/있음 25, 이차적인 진단 0/15, 보행 보조 0/15/30, 정맥수액요법·헤파린 록 0/20, 걸음걸이 0/10/20, 의식장애 0/15 · 0~24점 저위험군, 25~50점 중위험군, 51~125점 고위험군",
    // 목요일 장면 2: 의사 구두 처방 (교육용 초안, 교수님 확인 필요)
    thu: "IICP 악화 보고 시 의사 구두 처방(예): 침상머리 30° 올리고 목은 중립(일직선) 유지 · 20% Mannitol 100mL IV · 응급 Brain CT · 15분마다 GCS·동공·V/S 확인 후 보고"
  };

  // 욕창·낙상 개인 평가 (학교 자료 "상황지침-욕창, 낙상 체크용.pdf" + "욕창 및 낙상_측정도구.pdf")
  // 팀 시뮬레이션은 장면 1~2만 하고, 욕창·낙상은 자리에서 각자 측정도구로 평가함
  const ASSESS_CASE = "김길동님은 수술 후 의식이 명료하고 의사소통이 가능한 상태이다. 현재 낙상으로 인해 대부분의 시간을 침상에서 보내고 있으며, 침상에서 전혀 체위 변경을 할 수 없어 간호사가 전적으로 체위를 변경해주어야 한다. 또한 근력이 약해서 침상에서 자주 아래로 미끄러지며, 체위 변경 시 피부가 침대에 마찰되는 경우가 자주 관찰된다. 실금은 없으나 화장실 이용 시에는 휠체어를 사용해야 하며, 린넨 교체를 자주 요청하고 있다. 당뇨식을 제공받고 있으나 제공량의 약 절반 정도만 섭취하고 있다.";
  const BRADEN = [
    {k:"sens", label:"감각지각", opts:[[1,"완전제한"],[2,"매우제한"],[3,"약간제한"],[4,"제한없음"]]},
    {k:"moist", label:"피부습기", opts:[[1,"항상 축축함"],[2,"축축함"],[3,"가끔 축축함"],[4,"거의 축축하지 않음"]]},
    {k:"act", label:"활동상태", opts:[[1,"침대에만 있음"],[2,"주로 앉아 있음"],[3,"가끔 보행함"],[4,"자주 보행함"]]},
    {k:"mob", label:"가동성", opts:[[1,"완전부동"],[2,"매우제한"],[3,"약간제한"],[4,"제한없음"]]},
    {k:"nut", label:"영양섭취", opts:[[1,"매우불량"],[2,"불량함"],[3,"적절함"],[4,"우수함"]]},
    {k:"fric", label:"피부마찰과 쓸림", opts:[[1,"문제가 있음"],[2,"잠재적 문제"],[3,"문제없음"]]}
  ];
  const MORSE = [
    {k:"hx", label:"과거 낙상 경험 (3개월 이내)", opts:[[0,"없음"],[25,"있음"]]},
    {k:"dx", label:"이차적인 진단", opts:[[0,"없음"],[15,"있음"]]},
    {k:"aid", label:"보행 보조", opts:[[0,"사용 안 함/침상안정/휠체어/사람이 도와줌"],[15,"목발/지팡이/보행기"],[30,"주변 기물·기구를 잡고 보행"]]},
    {k:"iv", label:"정맥수액요법/헤파린 록", opts:[[0,"없음"],[20,"있음"]]},
    {k:"gait", label:"걸음걸이", opts:[[0,"정상보행/침상안정/부동"],[10,"균형·시선 유지, 기력 저하"],[20,"장애가 있음"]]},
    {k:"ment", label:"의식장애", opts:[[0,"의식 명료, 자신의 기능 수준을 잘 앎"],[15,"의식 명료하지 않거나 기능 수준을 과대평가·잊어버림"]]}
  ];
  // 교수님이 정한 기준 (2026-11-09): Braden 12점 고위험군, Morse 80점 고위험군
  const ASSESS_KEY = {braden:{sens:4, moist:2, act:2, mob:1, nut:2, fric:1}, morse:{hx:25, dx:15, aid:0, iv:20, gait:20, ment:0}};
  const bradenRisk = t => t <= 9 ? "초고위험군" : t <= 12 ? "고위험군" : t <= 14 ? "중위험군" : "저위험군";
  const morseRisk = t => t >= 51 ? "고위험군" : t >= 25 ? "중위험군" : "저위험군";
  const sumOf = (defs, v) => defs.reduce((n, d) => n + (+v[d.k] || 0), 0);
  // 기록 문장 ↔ 점수 (서버에는 문장만 저장되므로)
  function assessText(who, b, m){
    return `${who}: Braden ${sumOf(BRADEN, b)} (${BRADEN.map(d => b[d.k]).join(",")}) ${bradenRisk(sumOf(BRADEN, b))} / Morse ${sumOf(MORSE, m)} (${MORSE.map(d => m[d.k]).join(",")}) ${morseRisk(sumOf(MORSE, m))}`;
  }
  function parseAssess(text){
    const x = /^(.*?): Braden (\d+) \(([\d,]+)\).*?Morse (\d+) \(([\d,]+)\)/.exec(String(text || "").replace(/^(개인 평가|조 최종) /, ""));
    if (!x) return null;
    const b = {}, m = {}; x[3].split(",").forEach((v, i) => b[BRADEN[i].k] = +v); x[5].split(",").forEach((v, i) => m[MORSE[i].k] = +v);
    return {who:x[1], b, m, bt:+x[2], mt:+x[4]};
  }
  // 기록에서 개인 평가·조 최종 점수 모으기 (사람마다 마지막 것)
  function assessFromLog(log){
    const ind = {}; let fin = null;
    (log || []).forEach(e => {
      if (e.kind === "assess"){ const p = parseAssess(e.text); if (p) ind[p.who] = p; }
      if (e.kind === "assessFinal"){ const p = parseAssess(e.text); if (p) fin = p; }
    });
    return {ind: Object.values(ind), fin};
  }

  // 일정표 (510호, 13:00~17:00)
  const SCHEDULE = [
    {date:"2026-11-11", label:"11/11(수)", rows:[
      ["13:00","13:20","오리엔테이션: 사례 소개, 시뮬레이션 화면 시연", "상황지침 설명 및 술기 확인"],
      ["13:20","14:40","조 분배, 역할 결정 후 시나리오 작성", "조 분배는 각자 정함 · 역할을 정한 뒤 시나리오 카드 작성"],
      ["14:40","14:50","시나리오 점검 및 확인", "정해야 하는 사항: 활력징후, 동공반사 결과, GCS 및 의식상태, IICP 증상 여부, 폐음(crackle 또는 wheezing), BST 수치에 따른 RI sliding 수치"],
      ["14:50","15:00","휴식"],
      ["15:00","15:40","조별 시나리오 연습 (최소 2회)", "장면 1 신경계 초기 사정 → 장면 2 인슐린 피하주사"],
      ["15:40","16:30","조별 시나리오 구현 및 평가", "1조 → 2조 → 3조 차례로 장면 1~2 구현(조마다 약 15분), 나머지 두 조는 '다른 조 평가'로 술기 체크와 한마디 → 세 조가 끝나면 모두 욕창·낙상 개인 평가(측정도구)"],
      ["16:30","16:50","디브리핑 및 성찰"],
      ["16:50","17:00","정리 및 마무리"]]},
    {date:"2026-11-12", label:"11/12(목)", rows:[
      ["13:00","13:20","수요일 돌아보기 + 목요일 상황 제시", "같은 환자 김길동님, 수술 후 1일째 아침 · 두개내압 상승(IICP) 악화"],
      ["13:20","14:00","역할 교대, 시나리오 수정", "수요일에 간호사를 하지 않은 학생이 간호사1·2 · 장면 1 재사정, 장면 2 IICP 악화와 의사 SBAR 보고·처방 수행"],
      ["14:00","14:10","시나리오 점검", "정해야 하는 사항: 장면별 활력징후(쿠싱 징후), 동공 변화, GCS 변화, IICP 증상, 의사 보고 SBAR, 구두 처방"],
      ["14:10","14:50","조별 시나리오 연습 (최소 2회)", "장면 1 신경계 재사정 → 장면 2 IICP 악화 · 의사 보고와 처방 수행"],
      ["14:50","15:00","휴식"],
      ["15:00","15:50","조별 시나리오 구현 및 평가", "1조 → 2조 → 3조 차례로 장면 1~2 구현(조마다 약 15분), 나머지 두 조는 '다른 조 평가'(관찰 분담: 1~11 / 38~43 / SBAR / 담당간호사 / 시간)로 술기 체크와 한마디"],
      ["15:50","16:40","디브리핑 및 성찰", "악화를 알아차린 시점, SBAR 보고의 질, 처방 수행과 재사정"],
      ["16:40","17:00","정리 및 마무리", "담당간호사를 중심으로 간호기록 작성(시간 순서, 측정값·보고·처방·결과), 실습보고서 초안"]]}
  ];

  const VKEYS = [
    ["bp","혈압 (mmHg)"],["hr","맥박·심전도 (회/분)"],["rr","호흡 (회/분)"],["spo2","SpO₂ (%)"],["bt","체온 (℃)"],
    ["gcs","GCS (E·V·M, 삽관 시 VT) 및 의식상태"],["pupil","동공반사 (크기·반사, 우/좌)"],["iicp","IICP 증상 여부 (오심·구토·두통)"],
    ["lung","폐음 (정상 / crackle / wheezing)"],["bst","혈당 BST (mg/dL)"],["look","눈에 보이는 모습"]
  ];
  const GROUPS = [{id:"g1",label:"1조"},{id:"g2",label:"2조"},{id:"g3",label:"3조"},{id:"ex",label:"예시"}];

  // 술기 체크리스트 (work sheet 수행항목 1~37; 원본 38번은 37번과 같은 문장이라 뺌)
  const SKILLS_WED = [
    {sec:"신경계 사정", items:[
      [1,"손씻기를 수행한다."],
      [2,"환자에게 자신을 소개하고 환자의 ID를 확인한다."],
      [3,"환자에게 심전도를 연결한다."],
      [4,"산소포화도 측정기(Pulse oximetry)를 연결한 후 수치를 확인한다."],
      [5,"light를 이용하여 직접/간접 동공반사를 확인한다. (직접·간접 동공반사, 동공크기와 모양)"],
      [6,"활력징후(혈압, 호흡, 체온)를 측정한다. 맥박은 심전도로 확인한다."],
      [7,"환자에게 말을 걸며 의식상태를 살핀다. GCS (눈뜨기 확인)"],
      [8,"환자의 언어반응을 확인한다. GCS (기관내 삽관 중 설명)"],
      [9,"환자의 운동능력을 확인한다. GCS (팔다리 withdrawal 여부)"],
      [10,"환자에게 오심/구토/두통 등 IICP 증상 여부를 확인한다."],
      [11,"환자의 폐를 청진한다."]]},
    {sec:"욕창 예방", items:[
      [12,"감각을 확인한다 (압력과 관련된 불편함에 대하여 반응하는 능력)."],
      [13,"피부가 습기에 노출된 정도를 확인한다."],
      [14,"신체활동, 보행 등 활동 정도를 확인한다."],
      [15,"체위를 변경하고 조절하는 능력을 확인한다."],
      [16,"음식 섭취 등 영양을 확인한다."],
      [17,"침상 위 이불에 의한 마찰과 엇밀림을 확인한다."],
      [18,"욕창예방을 위한 대상자 질문에 대한 응답 및 교육을 실시한다."]]},
    {sec:"낙상 예방", items:[
      [19,"낙상 경험 여부를 확인한다."],
      [20,"2차적 진단 유무를 확인한다."],
      [21,"보행 보조 여부를 확인한다."],
      [22,"정맥수액요법이나 헤파린 록을 확인한다."],
      [23,"걸음걸이를 확인한다."],
      [24,"의식정보를 확인한다."],
      [25,"낙상예방을 위한 대상자 질문에 대한 응답 및 교육을 실시한다. (필요 시) 낙상주의 안내문을 제공하고 팔찌를 착용해 준다."],
      [26,"대상자에게 불편감이 있는지 확인한다."]]},
    {sec:"인슐린 피하주사", items:[
      [27,"필요한 물품을 준비한다."],
      [28,"손소독제로 손위생을 실시한다."],
      [29,"대상자의 이름을 개방형으로 질문하여 대상자를 확인하고, 입원팔찌와 투약카드를 대조하여 대상자(이름, 등록번호)를 확인한다."],
      [30,"준비된 약물의 투여목적과 작용 및 유의사항에 대해 설명한다."],
      [31,"인슐린 주사 부위 기록지(그림표)를 보고 주사 부위를 선택한 후 편안한 자세를 취하도록 한다. (타박상·부종·경결·민감성·변색 사정, 이전 부위 확인 후 교대)"],
      [32,"손소독제로 손위생을 실시한다."],
      [33,"주사 놓을 부위를 소독솜으로 안에서 바깥쪽으로 직경 5~8cm 정도 둥글게 닦는다."],
      [34,"바늘 뚜껑을 제거하고, 주사기를 잡지 않은 손으로 주변 피부를 팽팽하게 잡고, 45°~90°로 빠르면서도 정확하게 삽입한 후 약물을 주입한다."],
      [35,"바늘을 재빨리 뺀 후 주사기는 쟁반(tray)에 넣고, 부위는 소독솜으로 살짝 눌러 주되 마사지하지 않는다."],
      [36,"인슐린 주사부위 기록지(그림표)에 주사시행 사항을 기록한다 (날짜, 시간, 서명)."],
      [37,"사용한 물품을 정리한다 (바늘은 뚜껑을 되씌우지 않은 채 손상성폐기물 전용용기, 소독솜과 주사기는 일반 의료폐기물 전용용기)."]]}
  ];
  // 욕창·낙상 사정(12~26)은 팀 시뮬레이션이 아니라 개인 평가(측정도구)로 대신함
  SKILLS_WED.forEach(s => { if (s.sec === "욕창 예방" || s.sec === "낙상 예방") s.indiv = true; });
  // 목요일: 신경계 재사정(1~11) + IICP 악화 대처(38~43, 교육용 초안 · work sheet에 없는 목요일 추가 항목)
  const SKILLS_THU = [
    {sec:"신경계 재사정", items: SKILLS_WED[0].items},
    {sec:"IICP 악화 대처 (목요일 추가)", items:[
      [38,"GCS 저하, 동공 크기·반사 변화, 활력징후 변화(쿠싱 3징후: 혈압 상승·맥압 증가, 서맥, 불규칙 호흡)를 이전 기록과 비교해 IICP 악화를 알아차린다."],
      [39,"리더에게 알리고 팀에 응급 상황을 공유하며 역할을 다시 나눈다."],
      [40,"의사에게 SBAR로 보고한다 (상황, 배경, 사정, 요청)."],
      [41,"구두 처방을 되읽어(read-back) 확인하고 기록한다."],
      [42,"처방에 따라 중재한다: 침상머리 30° 올리기, 목 중립 유지, 처방 약물(Mannitol) 확인·투여 준비."],
      [43,"중재 후 GCS·동공·활력징후를 다시 사정하고 결과를 보고·기록한다."]]}
  ];
  const SKILLS = IS_THU ? SKILLS_THU : SKILLS_WED;
  // work sheet 핵심기본간호술과 수업에서 하는 곳
  const CORE_SKILLS = IS_THU ? [
    ["말초산소포화도 측정", "팀 · 장면 1~2 (수행항목 4번, 재측정 포함)"],
    ["심전도 모니터링 적용", "팀 · 장면 1~2 (수행항목 3번, 맥박·리듬 변화 확인)"],
    ["욕창관리 및 낙상예방간호", "수요일 개인 평가에서 함"],
    ["피하주사 (인슐린)", "수요일 장면 2에서 함"]
  ] : [
    ["말초산소포화도 측정", "팀 · 장면 1 (수행항목 4번)"],
    ["심전도 모니터링 적용", "팀 · 장면 1 (수행항목 3번)"],
    ["욕창관리 및 낙상예방간호", "개인 평가 · Braden·Morse (수행항목 12~26번)"],
    ["피하주사 (인슐린)", "팀 · 장면 2 (수행항목 27~37번)"]
  ];
  const SIM_SKILLS = SKILLS.filter(s => !s.indiv);
  const SKILL_TOTAL = SIM_SKILLS.reduce((n,s) => n + s.items.length, 0);
  const SCENE_COUNT = 2;
  const skillSec = no => (SKILLS.find(s => s.items.some(it => it[0] === no)) || {}).sec || "";

  // 예시 시나리오 (장면 2개): RI sliding은 학교 자료(REF)에 맞춤, 활력징후 등 나머지 수치는 교육용 값
  const EXAMPLE_WED = {
    groupName:"예시 조",
    ri:"BST 151–200 mg/dL → RI 2U / 201–250 → RI 4U / 251–300 → RI 6U / 301–350 → RI 8U / 351–400 → RI 10U (의사진료지시서)",
    scenes:[
      {title:"도착·신경계 초기 사정", time:"14:00", event:"수술 후 신경계 중환자실 도착. 기관내 삽관 상태로 기계환기 (수업에서는 환자가 짧게 말할 수 있게 설정, GCS 언어반응은 VT로 기록)", cues:"보호자(아내): 남편이 술 마시고 계단에서 넘어졌어요. 당뇨로 인슐린 맞고 계세요", expected:"손위생, 환자 확인, 심전도·산소포화도 연결, 동공반사, 활력징후, GCS(삽관 VT), IICP 증상, 폐 청진", advance:"초기 사정을 마치면",
       script:"간호사1: (손소독 후) 안녕하세요, 신경계 중환자실 간호사 OOO입니다. 성함이 어떻게 되세요? (입원팔찌로 이름·등록번호 0123456 확인) [1, 2]\n환자: (힘없이) 김길동이요…\n간호사2: 심전도와 산소포화도 측정기 연결하겠습니다. [3, 4]\n간호사2: (펜라이트로 양쪽 동공 확인) 3mm, 직접·간접 반사 모두 즉각입니다. [5]\n환자: (이름을 부르자 눈을 뜨고, 손등을 누르자 손으로 밀어냄) [7, 9]\n간호사1: 기관내관이 있어서 언어반응은 VT로 기록합니다. GCS 9T입니다. [8]\n간호사2: 메스껍거나 머리 아프신 데 있으세요? [10]\n환자: 아니요… [10]\n보호자: 남편이 술 마시고 계단에서 넘어졌어요. 괜찮은 거죠?",
       vitals:{bp:"148/86",hr:"92",rr:"16 (기계환기)",spo2:"97",bt:"37.2",gcs:"9T (E3 VT M5)",pupil:"R 3 즉각 / L 3 즉각",iicp:"없음 (오심·구토·두통 없다고 함)",lung:"양측 하엽 crackle 약간, 기관 내 분비물 소량",bst:"248",pu:"",fall:"",look:"이름 부르면 눈을 뜸, 통증에 손으로 밀어냄, 머리 드레싱 건조, 왼손 정맥로 NS 1L"}},
      {title:"인슐린 피하주사", time:"14:20", event:"식사 전 혈당 측정 후 의사진료지시서의 RI sliding scale에 따라 인슐린 피하주사 (BST 268 → 251–300 구간 RI 6U SC)", cues:"오더지: RI Sliding 251–300 mg/dL → RI 6U. 보호자: 주사는 어디에 놓나요?", expected:"오더지의 RI sliding 구간 확인, 물품 준비, 손위생, 대상자 확인(개방형 질문으로 이름 확인, 팔찌·투약카드의 이름·등록번호 대조), 투여목적 설명, 주사부위 기록지로 부위 선택·교대, 소독, 45~90° 주입, 마사지 금지, 기록, 폐기물 처리", advance:"종료 (이어서 욕창·낙상 개인 평가)",
       script:"간호사2: (혈당 측정) 268입니다.\n간호사1: (의사진료지시서 확인) RI sliding 251–300 구간이라 RI 6U 피하주사입니다. 같이 확인해 주세요.\n간호사2: (물품 준비 후 손소독) 성함 말씀해 주시겠어요?\n환자: 김길동이요.\n간호사2: (팔찌와 투약카드로 이름·등록번호 0123456 대조) 혈당을 낮추는 인슐린 주사입니다. [27, 28, 29, 30]\n보호자: 주사는 어디에 놓나요?\n간호사2: 지난번은 왼쪽 배에 놓아서 이번엔 오른쪽 배에 놓겠습니다. [31]",
       vitals:{bp:"146/82",hr:"90",rr:"16 (기계환기)",spo2:"97",bt:"37.3",gcs:"9T (E3 VT M5)",pupil:"R 3 즉각 / L 3 즉각",iicp:"없음",lung:"흡인 후 crackle 줄어듦",bst:"268",pu:"",fall:"",look:"편안해 보임, 이전 주사부위(좌측 복부) 경결 없음"}}
    ],
    roles:[
      {role:"의사", student: AI_ON ? "" : "학생5", persona:"신경외과 전문의 이익준. 바쁘고 말이 짧음. 전화로 응답하고, 보고가 불분명하면 되물음. 아는 정보: 의사진료지시서 오더(V/S q1hr, GCS·동공반사 확인, 식사 전 BST 4회/일, RI sliding scale 151–400 mg/dL, IICP 증상 확인). 꼭 할 말: \"환자 상태부터 말씀해 주세요.\" / \"혈당이 몇이에요? 오더대로 RI 주세요.\" 오더 범위를 벗어나거나 IICP 징후가 있으면 지시함. 하지 않을 것: 수치를 먼저 알려 주지 않음, 간호사가 확인할 것을 대신 판단해 주지 않음", aiPlays:AI_ON},
      {role:"간호사1 (리더)", student:"학생1", persona:"", aiPlays:false},
      {role:"간호사2", student:"학생2", persona:"", aiPlays:false},
      {role:"환자 김길동", student:"학생3", persona:"75세 남. 기관내 삽관 상태지만 수업에서는 짧게 말할 수 있음. 수술 후 피곤하고 힘이 없어 힘없이 한두 마디로 대답하고, 장면별 의식 수준(GCS)에 맞게 눈뜨기·손 움직임을 보임. 아는 정보: 자기 이름, 술 마시고 계단에서 넘어진 것, 당뇨로 인슐린을 맞아 온 것, 메스꺼움·구토·두통 없음. 꼭 할 말: \"김길동이요…\"(이름을 물을 때) / \"주사 또 맞아요?\"(장면 2). 하지 않을 것: 길게 말하지 않음, 진단명을 알리지 않음, 묻지 않은 증상을 먼저 말하지 않음", aiPlays:false},
      {role:"보호자", student:"학생4", persona:"아내. 걱정이 많고 질문이 많음. 불안해서 같은 것을 다시 묻기도 함. 아는 정보: 술 드시고 계단에서 넘어진 경위, 당뇨로 인슐린을 맞아 옴, 수술 전 거의 누워 있었고 식사를 잘 못 함. 꼭 할 말: \"남편 괜찮은 거죠?\" / \"주사는 어디에 놓나요?\" 하지 않을 것: 간호사가 묻기 전에 정보를 한꺼번에 말하지 않음, 의학 용어를 쓰지 않음", aiPlays:false}
    ],
    sbar:[
      {label:"인수인계 (근무 교대)", s:"신경계 중환자실 간호사 OOO입니다. 김길동님, 개두술·혈종제거술 후 도착하셨고 현재 안정적입니다", b:"경막내출혈로 Craniotomy·혈종제거술, 당뇨로 인슐린 사용, 음주 후 계단 낙상, 기관내 삽관·기계환기, 왼손 정맥로 NS 1L, L-tube 경관식 DMLD 2000kcal, RI sliding 오더", a:"GCS 9T(E3 VT M5), 동공 3mm 즉각, BP 146/82, HR 90, SpO₂ 97%, 욕창·낙상 개인 평가 후 조 합의 Braden 12점 고위험군·Morse 80점 고위험군, 14:20 식사 전 혈당 268에 RI sliding대로 RI 6U SC 투여", r:"2시간마다 체위변경, 난간 올림 유지, 1시간마다 V/S·GCS·동공 사정, 다음 식사 전 BST 측정 부탁드립니다"}
    ],
    issues:[],
    // 14:40 시나리오 점검 때 조에게 던지는 질문 (AI가 만들고 교수님이 다듬어 확정)
    questions:[
      "환자의 GCS와 의식 상태에 대해 설명해 보세요.",
      "장면 2에서 RI 투여 전에 무엇을 확인해야 하는지 말해 보세요."
    ]
  };

  // 목요일 예시 시나리오 (수술 후 1일째 IICP 악화) · 수치·처방은 교육용 값 (교수님 확인)
  // GCS 표기는 수요일과 같이 VT를 1점으로 셈: 수요일 9T(E3 VT M5) → 장면 1 8T(E2 VT M5) → 장면 2 6T(E1 VT M4)
  const EXAMPLE_THU = {
    groupName:"예시 조",
    ri:"",
    scenes:[
      {title:"수술 후 1일째 아침 신경계 재사정", time:"08:00", event:"아침 정규 사정. 새벽부터 두통 호소, 구토 1회(밤 근무 간호기록). 기관내 삽관·기계환기 중 (수업에서는 환자가 짧게 말할 수 있게 설정, GCS 언어반응은 VT)", cues:"환자: 머리가 아파요… / (5명 조) 아내: 새벽에 토했어요. 어제보다 더 졸려 보여요 / 어제 기록: GCS 9T(E3 VT M5), 동공 3mm 즉각, BP 146/82, HR 90", expected:"손위생, 환자 확인, 심전도·산소포화도, 동공반사, 활력징후, GCS(VT), IICP 증상, 폐 청진, 어제 기록과 비교해 변화 알아차리기", advance:"재사정을 마치면 (20분 뒤 상태 변화)",
       script:"간호사1: (손소독 후) 안녕하세요, 오늘 담당 간호사 OOO입니다. 성함이 어떻게 되세요? (입원팔찌로 이름·등록번호 0123456 확인) [1, 2]\n환자: (눈을 겨우 뜨며) 김길동… 머리가 아파요…\n간호사2: 심전도와 산소포화도 확인하겠습니다. [3, 4]\n간호사2: (펜라이트) 오른쪽 4mm 반응이 조금 느리고, 왼쪽 3mm 즉각입니다. [5]\n간호사1: 이름을 불러야 눈을 뜨시네요. 어제는 부르면 바로 뜨셨는데… 손등을 누르면 밀어내십니다. 언어는 VT, GCS 8T입니다. [7, 8, 9]\n간호사2: 혈압 162/78, 맥박 68입니다. 어제보다 혈압은 오르고 맥박은 느려졌어요. [6]\n보호자: 새벽에 토했어요. 어제보다 더 졸려 보여요.",
       vitals:{bp:"162/78",hr:"68",rr:"14 (기계환기)",spo2:"96",bt:"37.6",gcs:"8T (E2 VT M5)",pupil:"R 4 약간 느림 / L 3 즉각",iicp:"두통 있음, 새벽 구토 1회",lung:"양측 하엽 crackle 약간",bst:"182",look:"눈 뜨기 힘들어함, 이마를 찡그림, 머리 드레싱 건조, 왼손 정맥로 NS 1L"}},
      {title:"IICP 악화 · 의사 SBAR 보고와 처방 수행", time:"08:20", event:"재사정 20분 뒤 의식이 더 떨어지고 오른쪽 동공이 커짐. 쿠싱 징후(혈압 상승·맥압 증가, 서맥, 불규칙 호흡)", cues:"모니터: BP 184/72, HR 54, 호흡 불규칙 / 환자: 불러도 눈을 뜨지 않고, 통증 자극에 팔을 움츠림 / (5명 조) 아내: 왜 대답을 안 해요?", expected:"IICP 악화 알아차리고 리더에게 알림, 의사에게 SBAR 보고, 구두 처방 되읽기, 침상머리 30°·목 중립, Mannitol 확인·투여 준비, 15분 뒤 GCS·동공·V/S 재사정과 기록, 보호자 설명", advance:"종료 (디브리핑)",
       script:"간호사2: (동공 확인) 오른쪽 5mm 반응 느림, 왼쪽 3mm 즉각입니다. [5]\n간호사1: 불러도 눈을 안 뜨고, 통증에 팔을 움츠립니다. GCS 6T. 혈압 184/72, 맥박 54예요. IICP 악화가 의심됩니다. 제가 보고할게요, 침상머리 올려 주세요. [38, 39]\n간호사1: (전화) 신경외과 이익준 선생님, 신경계 중환자실 간호사 OOO입니다. S: 김길동님 개두술 후 1일째인데, 20분 사이 GCS가 8T에서 6T로 떨어지고 오른쪽 동공이 5mm로 커져 반응이 느립니다. B: 어제 경막내출혈로 혈종제거술 받았고, 새벽부터 두통과 구토 1회 있었습니다. A: 혈압 184/72, 맥박 54, 호흡 불규칙해서 두개내압 상승이 악화된 것으로 판단됩니다. R: 바로 확인해 주시고 처방 부탁드립니다. [40]\n의사: 침상머리 30도 올리고, 20% 만니톨 100mL 정맥으로 주세요. 응급 CT 잡고, 15분마다 신경계 확인해서 알려 주세요.\n간호사1: 침상머리 30도, 20% 만니톨 100mL IV, 응급 Brain CT, 15분마다 GCS·동공·활력징후 확인. 맞습니까? [41]\n간호사2: (침상머리 30° 올리고 목을 일직선으로) 만니톨 확인하고 준비하겠습니다. [42]\n보호자: 왜 대답을 안 해요? 괜찮은 거죠?\n간호사1: 지금 머리 안 압력이 올라간 것 같아 의사 선생님께 알렸고, 처방대로 치료하고 있습니다. (15분 뒤) GCS·동공·활력징후 다시 확인하겠습니다. [43]",
       vitals:{bp:"184/72",hr:"54",rr:"10 불규칙 (기계환기 중 자발호흡 불규칙)",spo2:"94",bt:"37.8",gcs:"6T (E1 VT M4)",pupil:"R 5 느림 / L 3 즉각",iicp:"통증 자극에만 반응, 구토 1회 추가",lung:"양측 하엽 crackle",bst:"176",look:"불러도 눈을 뜨지 않음, 통증 자극에 팔을 움츠림, 오른쪽 동공 확대"}}
    ],
    roles:[
      {role:"의사", student: AI_ON ? "" : "학생5", persona:"신경외과 전문의 이익준. 바쁘고 말이 짧음. 전화로 보고를 받고, 보고가 불분명하면 되물음. 아는 정보: 어제 혈종제거술을 한 환자. IICP 악화 보고를 받으면 구두 처방: 침상머리 30°·목 중립, 20% Mannitol 100mL IV, 응급 Brain CT, 15분마다 GCS·동공·V/S 확인 후 보고. 꼭 할 말: \"환자 상태부터 말씀해 주세요.\" / \"GCS가 몇에서 몇으로 떨어졌어요? 동공은요?\" 하지 않을 것: 수치를 먼저 알려 주지 않음, 간호사가 보고하기 전에 처방하지 않음, 간호사가 되읽지 않으면 처방을 다시 말해 주지 않음", aiPlays:AI_ON},
      {role:"간호사1 (리더)", student:"학생1", persona:"", aiPlays:false},
      {role:"간호사2", student:"학생2", persona:"", aiPlays:false},
      {role:"환자 김길동", student:"학생3", persona:"75세 남, 수술 후 1일째. 장면 1: 이름을 불러야 눈을 뜨고(E2), 힘없이 \"머리가 아파요…\" 정도만 말함, 손등을 누르면 밀어냄(M5). 장면 2: 불러도 눈을 뜨지 않고(E1) 말하지 않음, 통증 자극에 팔을 움츠림(M4). 아는 정보: 새벽부터 머리가 아프고 한 번 토함. 하지 않을 것: 장면 2에서 말하거나 눈을 뜨지 않음, 묻지 않은 증상을 먼저 말하지 않음", aiPlays:false},
      {role:"보호자", student:"학생4", persona:"아내 (5명인 조만). 밤새 곁에 있었고 불안함. 아는 정보: 새벽에 남편이 머리가 아프다고 했고 한 번 토함, 어제보다 더 졸려 보임. 꼭 할 말: \"새벽에 토했어요. 어제보다 더 졸려 보여요.\" / \"왜 대답을 안 해요? 괜찮은 거죠?\" 하지 않을 것: 의학 용어를 쓰지 않음, 간호사가 묻기 전에 정보를 한꺼번에 말하지 않음", aiPlays:false}
    ],
    sbar:[
      {label:"의사 보고 (장면 2)", s:"신경외과 이익준 선생님, 신경계 중환자실 간호사 OOO입니다. 김길동님(75세 남) 개두술 후 1일째, 20분 사이 GCS 8T → 6T로 저하, 오른쪽 동공 5mm 반응 느림", b:"어제 경막내출혈로 Craniotomy·혈종제거술, 당뇨(인슐린), 기관내 삽관·기계환기, 새벽부터 두통·구토 1회", a:"BP 184/72(맥압 증가), HR 54, 호흡 불규칙, SpO₂ 94%, GCS 6T(E1 VT M4), 동공 R 5 느림/L 3 즉각 → IICP 악화로 판단", r:"바로 확인과 처방 부탁드립니다 (처방 받으면 되읽어 확인, 침상머리 30°, 15분마다 재사정)"}
    ],
    issues:[],
    questions:[
      "장면 1과 장면 2의 GCS·동공·활력징후를 어제 기록과 비교해, IICP 악화라고 판단한 근거를 말해 보세요.",
      "의사에게 SBAR로 보고할 때 A(사정)와 R(요청)에 무엇을 말할지, 구두 처방은 어떻게 확인할지 말해 보세요."
    ]
  };
  const EXAMPLE = IS_THU ? EXAMPLE_THU : EXAMPLE_WED;

  function normalize(o){
    const sc = {groupName:(o&&o.groupName)||"", ri:(o&&o.ri)||"", scenes:[], roles:[], sbar:(o&&o.sbar)||[], issues:(o&&o.issues)||[],
      questions:((o&&o.questions)||[]).map(q => String(q||"").trim()).filter(Boolean).slice(0,2)};
    for (let i=0;i<SCENE_COUNT;i++){
      const s = (o&&o.scenes&&o.scenes[i])||{}, v = s.vitals||{}, vit = {};
      VKEYS.forEach(([k]) => vit[k] = v[k]==null ? "" : String(v[k]));
      sc.scenes.push({title:s.title||("장면 "+(i+1)), time:s.time||"", event:s.event||"", cues:s.cues||"", expected:s.expected||"", advance:s.advance||"", script:s.script||"", vitals:vit});
    }
    sc.roles = ((o&&o.roles)||[]).map(r => ({
      role:r.role||"", student:r.student||"",
      persona:[r.persona, r.knows&&("아는 정보: "+r.knows), r.mustSay&&("꼭 할 말: "+r.mustSay), r.avoid&&("하지 않을 것: "+r.avoid)].filter(Boolean).join(" / "),
      aiPlays: AI_ON && !!r.aiPlays && !/간호사/.test(r.role||"")
    }));
    return sc;
  }

  // ---------- server ----------
  const mock = {
    get(k){ try{ return JSON.parse(localStorage.getItem("teamSimDemo:"+k)); }catch(e){ return null; } },
    set(k,v){ try{ localStorage.setItem("teamSimDemo:"+k, JSON.stringify(v)); }catch(e){} }
  };
  async function demoCall(action, d){
    await new Promise(r => setTimeout(r, 250));
    const scen = mock.get("scenarios") || {ex:{scenario:EXAMPLE, savedAt:new Date().toISOString()}};
    const logs = mock.get("logs") || [];
    if (action === "check") return {ok:true, teacher: d.pin === "1111", student: d.code === "0000" || d.pin === "1111"};
    if (action === "getScenario") return {ok:true, scenario: scen[d.g] ? scen[d.g].scenario : null};
    if (action === "listScenarios") return {ok:true, scenarios: scen};
    if (action === "saveScenario"){ scen[d.g] = {scenario:d.scenario, savedAt:new Date().toISOString()}; mock.set("scenarios", scen); return {ok:true}; }
    if (action === "log"){ d.entries.forEach(e => logs.push(Object.assign({g:d.g, runId:d.runId, at:new Date().toISOString()}, e))); mock.set("logs", logs.slice(-1500)); return {ok:true}; }
    const peerList = to => { const all = mock.get("peers") || [], last = {}; all.forEach(p => { if (!to || p.to === to) last[p.from + ">" + p.to] = p; }); return Object.values(last); };
    if (action === "dashboard"){
      const latest = {}; logs.forEach(l => latest[l.g] = l.runId);
      const res = {}; logs.forEach(l => { if (l.runId !== latest[l.g]) return; (res[l.g] = res[l.g] || {runId:l.runId, entries:[]}).entries.push(l); });
      return {ok:true, groups:res, peers: peerList()};
    }
    if (action === "peer"){ const all = mock.get("peers") || []; all.push({at:new Date().toISOString(), from:d.from, to:d.to, items:(d.items||[]).map(Number), good:d.good||"", fix:d.fix||""}); mock.set("peers", all.slice(-300)); return {ok:true}; }
    if (action === "peerFor") return {ok:true, peers: peerList(d.g)};
    if (action === "ai"){
      if (d.kind === "convert") return {ok:true, text: JSON.stringify(Object.assign({}, EXAMPLE, {issues:[{level:"확인 필요", where:"데모", text:"데모 모드라 붙여 넣은 내용 대신 예시 시나리오를 돌려줍니다."}]}))};
      if (d.kind === "debrief") return {ok:true, text:"(데모) 실제 연결 뒤에는 이 조의 기록을 읽고 만든 디브리핑 질문이 여기에 나옵니다."};
      return {ok:true, text:"(데모 응답) 지금 혈당이 얼마예요? 오더지 RI sliding대로 투여하세요."};
    }
    return {ok:false, error:"unknown_action"};
  }
  async function call(action, data){
    const d = Object.assign({action}, data||{});
    if (DEMO) return demoCall(action, d);
    const ctrl = new AbortController(); const tm = setTimeout(() => ctrl.abort(), action === "ai" ? 90000 : 20000);
    try{
      const res = await fetch(CFG.API_URL, {method:"POST", body: JSON.stringify(d), signal: ctrl.signal});
      return await res.json();
    }catch(e){ return {ok:false, error:"network"}; }
    finally{ clearTimeout(tm); }
  }
  const errText = e => ({
    network:"인터넷 연결을 확인하고 다시 시도하세요.", code:"수업 코드가 맞지 않습니다.", pin:"비밀번호가 맞지 않습니다.",
    daily_limit:"오늘 AI 사용 한도를 다 썼습니다. 아래의 고정 질문으로 진행하세요.", rate_limited:"AI 요청이 몰렸습니다. 30초 뒤 다시 시도하세요.",
    no_key:"이번 수업은 AI 없이 진행합니다."
  })[e] || "잠시 문제가 생겼습니다. 다시 시도하세요.";

  // ---------- prompts ----------
  function convertPrompt(txt){
    return `당신은 간호학과 시뮬레이션 교수자의 조교입니다. 아래는 간호학생 조가 작성한 '팀 시뮬레이션 시나리오 카드'입니다.
고정 조건(술기평가 work sheet 상황지침): ${CASE.text}
학교 자료 기준 (점검할 때 이 기준을 따르세요):
- ${REF.order}
- 오더지 RI sliding scale: ${REF.ri}. 조가 쓴 ri가 이 구간·단위와 다르면 issues에 적으세요. 400 mg/dL 초과는 오더지에 없으므로 그런 설정이면 의사 보고가 필요하다고 적으세요.
장면은 정확히 2개입니다: 장면 1 수술 후 신경계 초기 사정, 장면 2 처방된 인슐린 피하주사. 욕창·낙상은 시나리오에 넣지 않고 수행 뒤 학생이 각자 측정도구로 평가하므로 점검하지 마세요. 조가 장면 사이에 변화(예: IICP 징후)를 넣는 것은 허용합니다.
할 일:
1) 학생이 쓴 내용을 바꾸지 말고 아래 JSON 구조로 옮기세요. 학생 문장을 다듬지 마세요.
2) 학생이 비워 둔 수치는 임상적으로 타당한 교육용 값을 채우되, 그 칸마다 issues에 "학생이 비워 둠, 제안값"으로 적으세요.
3) 조가 반드시 정해야 하는 사항이 빠졌는지 먼저 확인하세요: 활력징후, 동공반사 결과, GCS 및 의식상태, IICP 증상 여부, 폐음(정상·crackle·wheezing 중 무엇인지), BST 수치에 따른 RI sliding scale(ri). 빠진 것은 issues에 적으세요.
   임상적으로 점검하세요: 환자는 기관내 삽관 상태지만 수업에서는 말할 수 있게 설정합니다(환자가 말하는 대본은 문제가 아님). 그래도 GCS 언어반응은 VT로 표기했는지와 E+M 합이 맞는지, 동공 크기·반사가 우/좌로 있는지, 장면 2의 BST가 RI sliding scale의 어느 구간인지와 투여 단위가 맞는지(저혈당 상태에서 인슐린을 주는 설정이 아닌지), IICP 증상 단서, 값이 생리적으로 가능한지, 장면 사이 변화가 논리적인지, 단서가 기대 행동으로 이어지는지. 문제는 issues에 적고 수치는 학생 값을 그대로 두세요.
4) 역할은 의사, 간호사1 (리더), 간호사2, 환자 김길동, 보호자입니다(4명인 조는 보호자 없음). 역할표의 이름 그대로 roles에 옮기세요. 학생 이름이 비어 있는 역할은 aiPlays=true. 4명인 조의 보호자처럼 쓰지 않는 역할은 roles에서 빼세요. 간호사 역할은 항상 aiPlays=false.
5) 역할 카드의 성격·정보·할 말·하지 않을 것을 roles에 옮기세요. SBAR 인수인계를 썼으면 sbar에 옮기세요.
7) 14:40 시나리오 점검 때 이 조 학생들에게 던질 점검 질문을 questions에 1~2개 쓰세요. 이 조 시나리오에서 환자안전이나 임상적 정확성에 가장 중요한 빈틈(예: RI 단위 근거, 삽관 환자 GCS VT 표기, IICP 판단 근거, 대상자 확인 방법)을 겨냥하고, 답을 알려 주지 말고 근거를 말하게 하는 열린 질문으로, 학생에게 말하듯 한 문장으로 쓰세요. 이 조가 쓴 내용(장면·수치·대사)을 짚어서 묻고, 일반적인 질문은 피하세요.
6) 대본 표의 줄을 장면별로 모아 그 장면의 script에 "인물: 대사·행동 [수행항목 번호]" 형식으로 한 줄씩 옮기세요(학생 문장 그대로). 대본에 빠진 수행항목 번호(1~11, 27~37; 12~26은 개인 평가로 대신함)가 있으면 issues에 적으세요.
JSON만 출력(설명·코드블록 없이):
{"groupName":"","ri":"BST 구간별 RI 단위 (예: 201~250: 4단위 / 251~300: 6단위)","scenes":[{"title":"","time":"14:00","event":"","cues":"","expected":"","advance":"","script":"","vitals":{"bp":"","hr":"","rr":"","spo2":"","bt":"","gcs":"","pupil":"","iicp":"","lung":"","bst":"","look":""}}],
"roles":[{"role":"","student":"","persona":"","knows":"","mustSay":"","avoid":"","aiPlays":false}],
"sbar":[{"label":"인수인계","s":"","b":"","a":"","r":""}],
"issues":[{"level":"수정 권장 또는 확인 필요","where":"장면 2 혈당","text":"한 문장"}],
"questions":["학생에게 던질 점검 질문 한 문장"]}
수치 칸은 모두 문자열. issues는 중요한 것부터 8개 이내. questions는 1~2개.

시나리오 카드:
${txt}`;
  }
  function parseJSON(text){
    const m = String(text||"").match(/\{[\s\S]*\}/);
    if (!m) throw new Error("no json");
    return JSON.parse(m[0]);
  }
  function rolePrompt(role, scene, sceneIdx, measured, hist, sc_ri){
    return `간호학과 팀 시뮬레이션에서 당신은 '${role.role}' 역할을 연기합니다. 학생들이 만든 역할 카드를 따르세요.
역할 카드: ${role.persona || "(설정 없음, 상식적으로 연기)"}
상황: ${CASE.text}
지금은 장면 ${sceneIdx+1} '${scene.title}' (${scene.time}). 일어나는 일: ${scene.event}. 이 장면의 단서: ${scene.cues}.
${scene.script ? "학생들이 쓴 이 장면의 대본(당신 역할의 줄을 따르되, 간호사가 대본과 다르게 말하면 상황에 맞게 답하세요):\n" + scene.script : ""}
간호사가 이미 측정한 값: ${measured || "아직 없음"}.
${sc_ri ? "처방된 RI sliding scale: " + sc_ri : ""}
규칙: 역할 카드에 없는 임상 정보나 수치를 지어내지 마세요. 당신 역할의 직무 범위를 넘는 처방·진단을 하지 마세요. 간호사가 묻지 않은 결정적 단서는 먼저 다 말하지 말고, 질문하면 알려 주세요. 환자 역할이면 기관내 삽관 상태지만 이 수업에서는 짧게 말할 수 있게 설정했으니, 힘없이 한두 마디로 답하고 필요하면 괄호 안에 몸짓을 함께 쓰세요(예: (눈을 뜨며) 네…). 한국어 구어체로 1~3문장.
지금까지 이 역할과의 대화:
${hist.slice(-10).join("\n")}
${role.role}의 답:`;
  }
  function debriefPrompt(sc, log){
    const plan = sc.scenes.map((x,i) => `장면 ${i+1} ${x.title}(${x.time}): 기대 행동 = ${x.expected}`).join("\n");
    const sbar = (sc.sbar||[]).map(b => `${b.label}: S ${b.s} / B ${b.b} / A ${b.a} / R ${b.r}`).join("\n");
    const missed = skillStatus(log).missing.map(x => `${x[0]}. ${x[1]}`).join("\n");
    const as = assessFromLog(log);
    const asTxt = as.ind.length ? as.ind.map(p => `${p.who}: Braden ${p.bt} / Morse ${p.mt}`).join("\n") + (as.fin ? `\n조 최종: Braden ${as.fin.bt} / Morse ${as.fin.mt}` : "") : "";
    return `당신은 간호 시뮬레이션 디브리핑을 돕는 조교입니다. 학생 조가 함께 읽을 수 있게 한국어로 쓰세요. 마크다운 기호(#, **)는 쓰지 마세요.
사례: ${CASE.text}
학생 조가 직접 만든 시나리오의 기대 행동:
${plan}
${sbar ? "학생이 미리 쓴 SBAR 인수인계:\n"+sbar : ""}
술기 체크리스트(work sheet)에서 체크되지 않은 항목:
${missed || "(없음)"}
${asTxt ? `욕창·낙상 개인 평가 (기준: Braden 12점 고위험군, Morse 80점 고위험군. 조원끼리 점수가 갈린 영역이 있으면 질문 하나를 그 영역에 대해 쓰세요):\n${asTxt}\n` : ""}수행 기록:
${log.filter(e => e.kind !== "members" && e.kind !== "run" && e.kind !== "assess" && e.kind !== "assessFinal").map(e => `[${e.t} 장면${e.scene}] ${e.text}`).join("\n") || "(기록 없음)"}
다음을 쓰세요. 기록에 있는 것만 근거로 하고, 기록이 없으면 '기록 없음'이라고 쓰세요.
1) 장면별로 기대 행동 대비 기록에서 보이는 것과 보이지 않는 것 (장면당 1~2줄). 체크되지 않은 술기 중 환자안전과 관련된 것을 짚으세요.
2) 실습보고서의 디브리핑 순서에 맞춘, 이 조의 실제 기록과 연결된 질문: 서술 단계 1개, 분석 단계 3개(우선순위 문제·우선 간호중재·수행 근거와 결과 확인), 적용 단계 1개, 고려사항 1개(환자·가족 관계와 교육, 환자안전, 의료진 의사소통 중 기록과 가장 관련 있는 것)
3) 미리 쓴 SBAR 인수인계와 실제 수행을 비교해 생각해 볼 점 1개
각 질문 앞에 [서술] [분석] [적용] [고려사항]을 붙이세요. 전체 20줄 이내.`;
  }

  // ---------- 술기 체크 현황 ----------
  function skillStatus(log){
    const done = {};
    // 기록 문장 "술기 체크 5. …" / "술기 해제 5. …"에서 번호를 읽음 (서버에는 문장만 저장되므로)
    (log||[]).forEach(e => { const m = e.kind === "skill" && /^술기 (체크|해제) (\d+)\./.exec(String(e.text||"")); if (m) done[+m[2]] = m[1] === "체크"; });
    const missing = [], bySec = {};
    SIM_SKILLS.forEach(s => { bySec[s.sec] = {done:0, total:s.items.length}; s.items.forEach(it => { if (done[it[0]]) bySec[s.sec].done++; else missing.push(it); }); });
    return {count: SKILL_TOTAL - missing.length, total: SKILL_TOTAL, missing, bySec, done};
  }

  // ---------- fixed debrief (AI 없이도 항상 나옴) ----------
  function fixedDebrief(sc, log){
    const firstAt = kind => { const e = log.find(x => x.kind === "measure" && x.text.indexOf(kind) >= 0); return e ? `장면 ${e.scene} (${e.t})` : "기록 없음"; };
    const st = skillStatus(log);
    const facts = [
      `심전도를 연결한 때: ${firstAt("심전도")}`,
      `산소포화도 측정기를 연결한 때: ${firstAt("산소포화도")}`,
      `동공을 처음 확인한 때: ${firstAt("동공")}`,
      `GCS를 처음 사정한 때: ${firstAt("GCS")}`,
      `폐를 청진한 때: ${firstAt("폐음")}`,
      `혈당을 처음 잰 때: ${firstAt("혈당")}`,
      `술기 체크리스트: ${st.count}/${st.total} · ` + SIM_SKILLS.map(s => `${s.sec} ${st.bySec[s.sec].done}/${st.bySec[s.sec].total}`).join(", "),
      `체크되지 않은 술기: ${st.missing.length ? st.missing.map(x => x[0]).join(", ") + "번" : "없음"}`
    ];
    const as = assessFromLog(log);
    if (as.ind.length) facts.push("욕창·낙상 개인 평가: " + as.ind.map(p => `${p.who} Braden ${p.bt}·Morse ${p.mt}`).join(", ") + (as.fin ? ` · 조 최종 Braden ${as.fin.bt}·Morse ${as.fin.mt}` : ""));
    const ours = IS_THU ? [
      "장면 1에서 어제 기록과 비교해 무엇이 달라졌다고 알아차렸나요? (GCS, 동공, 혈압·맥박, 두통·구토)",
      "IICP 악화라고 판단한 시점은 언제였고, 근거는 무엇이었나요? 더 일찍 알아차릴 수 있는 단서가 있었나요?",
      "의사에게 한 SBAR 보고에서 S·B·A·R이 분명했나요? 빠지거나 불필요한 정보는 무엇이었나요?",
      "구두 처방을 되읽어 확인했나요? 처방 수행(침상머리 30°, 목 중립, Mannitol) 뒤 무엇을 다시 사정했나요?",
      "응급 상황에서 리더는 역할을 어떻게 다시 나눴나요? 지시와 정보 공유는 분명했나요?",
      "미리 쓴 대본과 실제 수행이 달랐던 곳은 어디였나요? 대본에 있었지만 빠뜨린 항목이 있었나요?"
    ] : [
      "기관내 삽관 중인 환자의 의식 수준을 어떻게 사정했나요? 환자가 말을 하더라도 GCS 언어반응을 VT로 기록했나요?",
      "수술 후 첫 사정에서 IICP를 의심할 수 있는 징후(동공, 의식, 활력징후, 오심·구토·두통)를 무엇으로 확인했나요?",
      "욕창·낙상 개인 평가에서 조원끼리 점수가 갈린 영역은 어디였나요? 상황지침의 어떤 문장을 근거로 판단했나요?",
      "인슐린을 주기 전 대상자 확인(개방형 질문, 팔찌·투약카드 대조)과 혈당 확인을 어떻게 했나요?",
      "간호사들끼리 역할 분담과 정보 공유는 어떻게 이루어졌나요? 누가 리더였고, 지시는 분명했나요?",
      "미리 쓴 대본과 실제 수행이 달랐던 곳은 어디였나요? 대본에 있었지만 빠뜨린 수행항목이 있었나요?"
    ];
    sc.scenes.forEach((s,i) => { if (s.expected) ours.push(`장면 ${i+1} '${s.title}'에서 우리 조가 정한 기대 행동은 "${s.expected}"였습니다. 실제로 한 것과 다른 점은 무엇인가요?`); });
    if ((sc.sbar||[]).some(b => b.s || b.a)) ours.push("미리 써 둔 SBAR 인수인계와 실제로 한 인수인계는 어떻게 달랐나요? 빠진 정보가 있었나요?");
    // 실습보고서 '항목4 Debriefing'과 같은 순서·문항
    const stages = [
      {title:"1. 서술 단계", items:[
        "환자는 어떤 상황이었는가?",
        "전체적으로 잘 한 점은 무엇인가?",
        "환자 간호를 하면서 가장 힘들고 어려웠던 점은 무엇인가?",
        "전체적으로 환자 간호를 어떻게 수행했다고 평가하는가?",
        "이 사례와 비슷한 임상 상황을 실제 경험해 본 적이 있는가?"]},
      {title:"2. 분석 단계", items:[
        "이 환자의 경우 가장 우선적인 문제가 무엇이라고 판단했나?",
        "환자의 문제를 해결하기 위해 우선적으로 수행할 간호중재는 무엇이라고 판단했나?",
        "실제로 우선순위 간호중재를 정확하게 수행하였다고 보는가?",
        "수행했다면 그 근거는 무엇이고, 수행한 결과를 확인하였는가?",
        "실제로 수행하지 못했다면 그 이유는 무엇인가?",
        "우선적인 간호문제 이외에 다른 간호문제는 없었는가?"]},
      {title:"우리 조 시나리오와 비교 (분석 보충)", items:ours},
      {title:"3. 적용 단계", items:[
        "오늘 배운 것을 기반으로 실제 상황에 어떻게 적용할 수 있겠는가?",
        "오늘 배운 것 중에서 가장 중요한 것 한 가지를 꼽으라면 무엇인가?",
        "오늘 배운 것 중에서 기억에 남는 것은 무엇인가?"]},
      {title:"4. 고려사항", items:[
        IS_THU ? "환자 및 가족과의 치료적 관계 형성과 교육(상태 변화 설명, 보호자 정서적 지지)이 이루어졌는가?" : "환자 및 가족과의 치료적 관계 형성과 교육(낙상·욕창 예방, 인슐린 투여 등)이 이루어졌는가?",
        IS_THU ? "환자안전(정확한 환자확인, 구두 처방 되읽기, 투약원칙, 흡인 예방)을 준수하였는가?" : "환자안전(정확한 환자확인, 투약원칙, 낙상·흡인 예방)을 준수하였는가?",
        "의료진과의 의사소통이 정확하고 원만하게 이루어졌는가?"]}
    ];
    return {facts, stages};
  }

  // ---------- 다른 조 평가 (동료 평가) ----------
  const groupLabelOf = id => (GROUPS.find(g => g.id === id) || {label:id}).label;
  function peerText(p){
    const done = new Set((p.items || []).map(Number));
    const all = SIM_SKILLS.flatMap(s => s.items.map(it => it[0]));
    const miss = all.filter(n => !done.has(n));
    return `${groupLabelOf(p.from)} 평가: 술기 ${all.length - miss.length}/${all.length}` + (miss.length ? ` (체크 안 된 항목 ${miss.join(", ")}번)` : "") +
      (p.good ? ` · 잘한 점: ${p.good}` : "") + (p.fix ? ` · 보완할 점: ${p.fix}` : "");
  }

  // ---------- 실습보고서 초안 (기록 복사용) ----------
  // refl: 자기성찰 {group:[3], groupFix, mine:[{who, good, fix}]}
  function reportDraft(sc, log, groupLabel, aiDebrief, refl, peers){
    const f = fixedDebrief(sc, log);
    const st = skillStatus(log);
    const today = new Date().toLocaleDateString("ko-KR");
    const L = [];
    L.push("성인간호 신경계 시뮬레이션 실습보고서 (초안)");
    L.push(`날짜: ${today} · 조: ${groupLabel}${sc.groupName && sc.groupName !== groupLabel ? " (" + sc.groupName + ")" : ""}`);
    const mem = log.filter(e => e.kind === "members").pop();
    if (mem) L.push(mem.text);
    const rk = log.filter(e => e.kind === "run").pop();
    if (rk) L.push(rk.text + " 기록 기준");
    if (IS_THU){
      L.push("시나리오: 뇌수술(Craniotomy·혈종제거술) 후 1일째 두개내압 상승(IICP) 악화 환자의 신경계 재사정, 의사 SBAR 보고 및 중재 · 김길동(75세 남)");
      L.push("");
      L.push("[항목1 과학적 지식에 근거한 간호 실무 수행]");
      L.push("- 두개내압 상승(IICP)의 병태생리와 초기·후기 징후 (의식 저하, 동공 변화, 쿠싱 3징후)");
      L.push("- 신경학적 재사정: GCS(기관내 삽관 시 VT), 직접·간접 동공반사, 이전 기록과 비교");
      L.push("- IICP 간호중재: 침상머리 30°·목 중립, 삼투성 이뇨제(Mannitol)의 작용과 유의사항, 재사정");
      L.push("- 응급 상황의 의사소통: SBAR 보고, 구두 처방 되읽기(read-back)");
      L.push("");
      L.push("[항목2 간호상황에 따른 핵심기본간호술 수행]");
      L.push("- 말초산소포화도 측정 / 심전도 모니터링 적용");
      L.push(`- 팀 시뮬레이션 술기 체크 (장면 1~2): ${st.count}/${st.total} · ` + SIM_SKILLS.map(s => `${s.sec} ${st.bySec[s.sec].done}/${st.bySec[s.sec].total}`).join(", "));
      if (st.missing.length) L.push("  체크되지 않은 항목: " + st.missing.map(x => `${x[0]}. ${x[1]}`).join(" / "));
    } else {
    L.push("시나리오: 당뇨병 병력을 가진 뇌수술(Craniotomy·혈종제거술) 환자의 신경계 사정 및 중재 · 김길동(75세 남)");
    L.push("");
    L.push("[항목1 과학적 지식에 근거한 간호 실무 수행]");
    L.push("- 경막내출혈과 개두술·혈종제거술 후 병태생리, 두개내압 상승(IICP)의 징후와 예방 간호");
    L.push("- 신경학적 사정: GCS(기관내 삽관 시 언어반응 VT 표기), 직접·간접 동공반사");
    L.push("- 욕창 위험요인(감각, 습기, 활동, 체위변경, 영양, 마찰·엇밀림)과 예방 간호");
    L.push("- 낙상 위험요인(낙상 경험, 2차 진단, 보행 보조, 정맥수액, 걸음걸이, 의식)과 예방 간호");
    L.push("- 인슐린의 작용원리와 부작용(저혈당), 혈당 기준 투여");
    L.push("");
    L.push("[항목2 간호상황에 따른 핵심기본간호술 수행] (술기평가 work sheet)");
    L.push("- 말초산소포화도 측정 / 심전도 모니터링 적용");
    L.push("- 욕창관리 및 낙상예방간호");
    L.push("- 피하주사 (인슐린)");
    L.push("- 단순도뇨");
    L.push(`- 팀 시뮬레이션 술기 체크 (장면 1~2): ${st.count}/${st.total} · ` + SIM_SKILLS.map(s => `${s.sec} ${st.bySec[s.sec].done}/${st.bySec[s.sec].total}`).join(", "));
    if (st.missing.length) L.push("  체크되지 않은 항목: " + st.missing.map(x => `${x[0]}. ${x[1]}`).join(" / "));
    const as = assessFromLog(log);
    L.push("- 욕창·낙상 개인 평가 (Braden Scale, Morse Fall Scale · 상황지침-욕창, 낙상 체크용)");
    if (as.ind.length){
      as.ind.forEach(p => L.push(`  ${p.who}: Braden ${p.bt}점 ${bradenRisk(p.bt)} (${BRADEN.map(d => d.label + " " + p.b[d.k]).join(", ")}) / Morse ${p.mt}점 ${morseRisk(p.mt)} (${MORSE.map(d => d.label + " " + p.m[d.k]).join(", ")})`));
      if (as.fin) L.push(`  조 최종: Braden ${as.fin.bt}점 ${bradenRisk(as.fin.bt)} / Morse ${as.fin.mt}점 ${morseRisk(as.fin.mt)}`);
    } else L.push("  (개인 평가 기록 없음)");
    }
    L.push("");
    L.push("[항목3 비판적 사고를 활용한 간호과정 적용]");
    ["사정내용 분석 및 추가 사정할 내용","관련 간호진단","간호 목표","중재 계획","평가 및 재사정 계획"].forEach(x => L.push("- " + x + ":"));
    L.push("");
    L.push("[항목4 Debriefing]");
    L.push("기록 요약 (자동): " + f.facts.join(" / "));
    if (peers && peers.length){ L.push("다른 조 평가 (구현 및 평가 때)"); peers.forEach(p => L.push("- " + peerText(p))); }
    f.stages.forEach(s => { L.push(s.title); s.items.forEach((q,i) => L.push(`${i+1}) ${q}`, "   →")); });
    if (aiDebrief) { L.push("AI 디브리핑 참고"); L.push(aiDebrief); }
    L.push("");
    L.push("[항목5 자기성찰]");
    L.push("본 시뮬레이션 실습 진행과 관련하여");
    const R = refl || {}, g3 = R.group || [], mine = R.mine || [];
    L.push("❍ 우리 조의 장점 3가지를 쓰세요.  " + [0,1,2].map(i => `${i+1}) ${g3[i] || ""}`).join("  "));
    L.push("❍ 나의 장점 3가지를 쓰세요 (학생별 작성)." + (mine.some(m => m.good) ? "" : "  1)  2)  3)"));
    mine.filter(m => m.good).forEach(m => L.push(`  ${m.who}: ${m.good}`));
    L.push("❍ 우리 조가 보완할 점 1가지만 쓰세요.  1) " + (R.groupFix || ""));
    L.push("❍ 내가 보완할 점 1가지만 쓰세요 (학생별 작성)." + (mine.some(m => m.fix) ? "" : "  1)"));
    mine.filter(m => m.fix).forEach(m => L.push(`  ${m.who}: ${m.fix}`));
    L.push("");
    L.push("[◈ 간호과정 모의기록 보고서 · 간호기록지]");
    L.push("S: Subject data / O: Object data / A: Assessment / P: Planning / I: Intervention / E: Evaluation");
    L.push("날짜 | 시간 | 간호기록내용 | 확인");
    log.filter(e => !["debrief","members","run","assess","assessFinal"].includes(e.kind)).forEach(e => {
      const s = sc.scenes[e.scene-1];
      L.push(`${today} | ${s && s.time ? s.time : ""} | ${e.text.replace(/^측정: /,"")} | `);
    });
    L.push("(위 수행 기록을 근거로 S·O·A·P·I·E 순서로 다시 정리하세요.)");
    L.push("");
    L.push("[SBAR 인수인계 (상황별 각각 작성)]");
    const sb = (sc.sbar && sc.sbar.length) ? sc.sbar : [{label:"인수인계"}];
    sb.forEach(b => {
      L.push(b.label || "인수인계");
      L.push("S Situation (본인소개(소속, 이름), 환자정보(병동, 이름), 환자상태, 언제 발생했는가, 문제점): " + (b.s || ""));
      L.push("B Background (입원시 진단명·입원일, 최근 약물투여, 알레르기·과거력, 검사목록, 최근 활력징후, 그 밖의 임상정보): " + (b.b || ""));
      L.push("A Assessment (V/S, 의식수준(GCS), 동공반응, 신경학적 변화, 주증상, 심각성): " + (b.a || ""));
      L.push("R Recommendation (환자를 위한 처치, 인수자 수행 사항, 의견 제시, 의사 도착 전 수행할 사항, 환자의 요구사항): " + (b.r || ""));
    });
    L.push("(위 SBAR는 조가 미리 쓴 예상 인수인계입니다. 실제로 한 인수인계로 고쳐 쓰세요.)");
    return L.join("\n");
  }

  // 장면 순서: 1 신경계 초기 사정 → 2 인슐린 피하주사 (인슐린 장면 = 0부터 세어 1). 욕창·낙상은 개인 평가
  const INSULIN_SCENE = IS_THU ? -1 : 1;   // 목요일에는 인슐린 장면 없음
  window.TS = {DEMO, AI_ON, IS_THU, DAY, THU_DATE, CORE_SKILLS, CASE, REF, SCHEDULE, INSULIN_SCENE, SCENE_COUNT, VKEYS, GROUPS, SKILLS, SIM_SKILLS, SKILL_TOTAL, skillSec,
    ASSESS_CASE, BRADEN, MORSE, ASSESS_KEY, peerText, groupLabelOf, bradenRisk, morseRisk, sumOf, assessText, parseAssess, assessFromLog, EXAMPLE, normalize, call, errText, convertPrompt, parseJSON, rolePrompt, debriefPrompt, skillStatus, fixedDebrief, reportDraft};
})();
