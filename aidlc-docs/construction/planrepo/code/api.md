# PlanRepo HTTP API

기본 출처는 `http://127.0.0.1:3000`이다. Host는 실행 포트의 127.0.0.1 또는 localhost여야 한다. POST는 application/json과 Host에 정확히 맞는 Origin이 필요하다. 읽기 요청도 Origin이 있으면 검사한다. 입력의 추가 필드·자동 타입 변환은 허용하지 않는다.

| 메서드·경로 | 입력 | 성공 200 |
| --- | --- | --- |
| GET /api/connection | 없음 | recentConnection: 연결 입력 또는 null |
| POST /api/connection | repositoryUrl, folderPath | WorkspaceView |
| GET /api/workspace | query snapshotId | WorkspaceView |
| GET /api/document | query snapshotId, documentKey | DocumentView |
| POST /api/answers | snapshotId, selections: questionKey·optionLetter 배열 | CommitResult |
| GET /api/export | query snapshotId, documentKey | Markdown Buffer attachment |

WorkspaceView는 snapshotId·connection·documents·unresolvedQuestions·warnings다. DocumentView는 documentKey·safeHtml·effectiveQuestions·warnings다. CommitResult는 실제 저장된 결정의 questionKey·documentKey·selectedLetter·decidedAt과 workspace다. 공통 DTO는 src/shared/types.ts에 있다. 내부 비교 문자열·바이트 위치·전체 DB 행을 노출하지 않는다.

selections는 최소 하나이며 질문 키는 중복될 수 없다. 선택 문자는 질문에 실제 존재하는 대문자 한 글자다. 원문 완료 질문이나 다른 값으로 확정된 질문은 변경할 수 없다. 같은 답변 재요청은 최초 저장 시각을 보존한다. SnapshotId는 새 연결마다 달라지므로 이전 조회 핸들은 409로 거부한다.

오류 응답은 `error` 안에 `code`, `message`, `retryable`을 갖는다. 입력 오류 400, Host/Origin 403, 경로 없음 404, 만료/결정 충돌 409, body 제한 413, JSON 형식 요구 415, 원격 접근/리다이렉트 422, 내부·저장 구조·표시 오류 500, 원격 오류 502, 요청 한도·저장 실패 503, 원격 timeout 504다. 내부 스택·SQL·원격 body를 반환하지 않는다. API 응답은 no-store다.

다운로드 파일명은 Content-Disposition의 UTF-8 filename*로 제공하며 내용은 text/markdown; charset=utf-8이다. 내보내기에는 클라이언트 답변 값을 전달하지 않는다. 서버가 확정 결정을 적용하고 답변 위치 외 원본 바이트를 보존한다.
