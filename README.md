# Verbos 360 · 스페인어 동사 활용 인터랙티브 학습 사이트

국제학교 스페인어 동사 활용 수업용 사이트입니다. 24개 챕터 · 105개 섹션으로 현재형, 명령형, 점과거, 불완료과거, 미래, 가정미래, 과거분사·현재완료, 접속법 현재·과거, 진행형, 목적격 대명사, gustar까지 다룹니다.

## 기능
- **메인 페이지**: 전체 챕터·섹션 목록, 검색, 시제별 필터, 진도 표시
- **규칙 정리**: 섹션별 한국어 설명 + 활용표 (표의 스페인어를 누르면 발음 재생)
- **동사표 채우기**: 약 3,800개 동사 행, 즉시 채점 (악센트 오류는 별도 표시), 정답 보기
- **연습문제 약 1,800문항**: 빈칸 채우기, 객관식, 틀린 문장 고치기, 다른 하나 찾기, 짝 맞추기, 문장 배열, 질문에 답하기, 참·거짓, 크로스워드, 가짜 동사 찾기 — 모두 점수와 함께 채점
- **스피드 드릴**: 섹션 동사표에서 무작위 출제
- **스페인어 음성**: 기기에 설치된 가장 자연스러운 원어민 음성(Natural / Google / 향상된 음성)을 자동 선택, 중남미·스페인 억양 및 속도 조절
- **악센트 키보드**: á é í ó ú ü ñ ¿ ¡ 입력 도우미
- 점수·진도는 각 학생 브라우저(localStorage)에 저장

## 구조
```
index.html          메인(목차)
chapter.html?ch=N   챕터 페이지 (&s=섹션번호)
data/book.js        목차 메타데이터
data/chNN.js        챕터별 규칙·동사표·연습문제 데이터
js/ css/            스크립트와 스타일
```
교재의 문장과 설명은 저작권 문제가 없도록 이름·상황·어휘를 바꾸어 새로 구성했습니다.

## 💬 학습 도우미 챗봇 (Profe Búho)
모든 페이지 오른쪽 아래 💬 버튼으로 엽니다.

**① 내장 모드 (설정 없이 바로 작동, 무료)**
- 동사 활용 조회: `tener 점과거`, `dormir 접속법 nosotros`, `ir 명령형`
- 활용형 역추적: `hicieron` → hacer · 점과거 · ellos
- 문법 Q&A: `ser estar 차이`, `점과거 불완료 차이`, `gustar 어떻게 써?`, `접속법은 언제?`
- 섹션 검색 및 바로가기, `퀴즈 내줘`로 무한 퀴즈
- 733개 동사 사전(`data/verbs.js`)은 챗봇을 열 때만 불러옵니다.

**② AI 선생님 모드 (자유 질문 답변, 선택)**
API 키를 공개 사이트에 넣으면 누구나 훔쳐 쓸 수 있으므로, 키는 Cloudflare Worker(무료 플랜 가능)에만 보관합니다.
1. https://console.anthropic.com 에서 API 키 발급 (사용량만큼 과금 — Console에서 월 사용 한도를 꼭 설정하세요)
2. https://dash.cloudflare.com → Workers & Pages → Create → "Hello World" Worker 생성 (이름 예: `verbos360-chat`)
3. Edit code → `worker/worker.js` 내용을 붙여넣고 Deploy
4. Worker의 Settings → Variables and Secrets
   - Secret `ANTHROPIC_API_KEY` = 발급받은 키
   - Text `ALLOWED_ORIGIN` = `https://yalli2.github.io`
5. Worker 주소(예: `https://verbos360-chat.계정.workers.dev`)를 `js/config.js`의 `chatEndpoint`에 넣고 커밋
→ 챗봇 상단에 "🤖 AI 선생님 / 📖 빠른 사전" 전환 버튼이 생깁니다. 동사표 조회·퀴즈는 계속 사전으로 즉시 답하고, AI 연결이 실패하면 자동으로 사전 답변으로 넘어갑니다.
