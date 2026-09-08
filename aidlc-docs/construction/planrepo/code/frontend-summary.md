# 화면 구현

src/client/App.vue가 최근 입력·workspace·선택 문서·문서 응답·임시 선택을 소유한다. api.ts는 같은 출처의 JSON·다운로드 호출을 처리한다. components 아래 ConnectionForm, DocumentList, DocumentViewer, DecisionQueue, DecisionQueueItem, ConfirmBar, ExportButton, WarningPanel, StatusMessage가 표시와 이벤트를 나눈다.

문서 전환은 선택을 유지한다. 문서 응답은 요청 순서·snapshot·문서 키가 맞을 때만 적용한다. 새 연결 성공 시 선택을 초기화하고 실패 시 이전 상태를 유지한다. 저장 성공 시 실제 서버 결과로 대기열을 갱신하며 실패 시 선택을 보존한다. 저장 상태 다시 확인은 응답 유실 시 사용할 수 있다.

질문·선택지·경고는 Vue 텍스트 바인딩이고 본문만 서버 safeHtml을 표시한다. fieldset·legend·label과 안정적인 data-testid를 제공한다. 라디오 그룹은 기본 키보드 동작을 사용한다. 다운로드 안내에는 확정 답변만 포함함을 명시한다.

Vue 타입 검사·Vite 빌드와 SM-01 브라우저 핵심 여정으로 확인한다. 별도 UI 테스트 프레임워크·라우터·전역 상태 패키지는 도입하지 않았다.
