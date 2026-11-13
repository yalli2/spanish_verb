/* 사이트 설정
 * chatEndpoint: AI 선생님 모드용 서버 주소 (Cloudflare Worker 등). 비워 두면 내장 사전 챗봇만 작동합니다.
 * 예) chatEndpoint: 'https://verbos360-chat.내계정.workers.dev'
 * ※ API 키는 절대 이 파일에 넣지 마세요 (공개 사이트라 누구나 볼 수 있습니다). 키는 Worker의 비밀 변수에만 저장합니다.
 */
window.SV_CONFIG = {
  chatEndpoint: ''
};
