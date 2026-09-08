# PlanRepo 구성 요소 메서드와 계약

## 표기

아래는 언어에 독립적인 개념적 메서드다. `List[T]`는 목록, `Optional[T]`는 값 없음 허용, `Result[T]`는 성공값 또는 `AppError`다. 실제 함수·HTTP 경로·직렬화는 후속 단계에서 정한다.

## 공유 입출력 타입

| 타입 | 의미와 주요 필드 |
| --- | --- |
| DocumentKey / QuestionKey / SnapshotId | 서버가 검증하는 문서 식별자, 질문 식별자, 활성 조회 컨텍스트 식별자 |
| SafeHtml / Warning | 안전한 렌더링 결과 문자열, 문서·위치·사용자 메시지를 가진 파싱 경고 |
| ConnectionInput | 사용자가 입력한 저장소 URL, 문서 폴더 경로 |
| RepositoryScope | 검증·정규화된 저장소 식별자와 폴더 경로 |
| SourceDocument | 저장소·경로를 포함하는 DocumentKey, 원문 Markdown, 원문 버전 정보 |
| SourceBundle | RepositoryScope, 기본 브랜치 조회 정보, 지정 폴더 아래 SourceDocument 목록 |
| ParsedQuestion | QuestionKey, 문서 식별, 질문 문구, 선택지 문자·내용, 원문 답변, 답변 위치와 원문 연결 정보 |
| ParseResult | 유효한 ParsedQuestion 목록과 문서 위치를 포함한 Warning 목록 |
| SavedDecision | QuestionKey, 선택 문자, 결정 시각, 원문 연결 검증 정보 |
| AnswerSelection | QuestionKey와 선택 문자; 결정 시각과 원문 위치는 클라이언트가 정하지 않음 |
| ReviewContext | SnapshotId, SourceBundle 및 문서별 ParseResult를 가진 서버 내부 조회 컨텍스트 |
| WorkspaceView | SnapshotId, 연결 정보, 문서 요약 목록, 미결정 질문 목록, 경고 |
| DocumentView | DocumentKey, 안전한 HTML, 해당 문서의 질문별 결정 상태와 경고 |
| CommitResult | 저장된 결정 목록 및 저장 결과를 반영한 WorkspaceView |
| DownloadFile | 파일명, Markdown 내용, 다운로드 콘텐츠 유형 |
| AppError | 안정적인 오류 구분값, 사용자 메시지, 사용자가 다시 시도할 수 있는지 여부; 내부 스택은 포함하지 않음 |

DocumentKey는 저장소와 문서를, QuestionKey는 문서 내 질문을 구분하는 불투명 식별자다. SnapshotId는 한 번 읽은 원문 집합을 구분하는 임시 핸들이며 인증 토큰이 아니다. 실제 식별자 생성·원문 변경 처리·위치 단위는 Functional Design에서 확정한다.

## C1 ReviewUI

| 메서드 | 목적 |
| --- | --- |
| `initialize() -> Result[Optional[ConnectionInput]]` | 최근 연결 정보를 받아 입력란 표시 |
| `connect(input: ConnectionInput) -> Result[WorkspaceView]` | 연결 제출 후 문서와 대기열 표시 |
| `openDocument(document: DocumentKey) -> Result[DocumentView]` | 활성 SnapshotId와 문서로 열람 요청 |
| `selectAnswer(question: QuestionKey, option: String) -> Void` | 현재 화면의 임시 선택 갱신 |
| `confirmAnswers() -> Result[CommitResult]` | 활성 SnapshotId와 임시 선택 목록 제출; 성공 후 반영 |
| `downloadDocument(document: DocumentKey) -> Result[DownloadFile]` | 확정 결과가 반영된 문서 내려받기 |

## C2 PlanRepoService

| 메서드 | 목적 |
| --- | --- |
| `getRecentConnection() -> Result[Optional[ConnectionInput]]` | C6에서 최근 연결 복원 |
| `connect(input: ConnectionInput) -> Result[WorkspaceView]` | C3 검증·읽기, C4 파싱, C6 결정 조회 후 ReviewContext 구성 |
| `getWorkspace(snapshot: SnapshotId) -> Result[WorkspaceView]` | 활성 컨텍스트와 저장 결정으로 대기열·문서 요약 반환 |
| `getDocument(snapshot: SnapshotId, document: DocumentKey) -> Result[DocumentView]` | 활성 원문을 C5로 렌더링하고 질문별 상태 전달 |
| `commitAnswers(snapshot: SnapshotId, selections: List[AnswerSelection]) -> Result[CommitResult]` | 질문·선택값 검증, 결정 시각 설정, C6 일괄 저장 후 상태 반환 |
| `exportDocument(snapshot: SnapshotId, document: DocumentKey) -> Result[DownloadFile]` | 컨텍스트 원문과 호환되는 C6의 확정 결정만 C7에 전달 |

## C3 GitHubSource

| 메서드 | 목적 |
| --- | --- |
| `validateConnection(input: ConnectionInput) -> Result[RepositoryScope]` | 네트워크 요청 전에 URL·폴더 입력 검증 및 정규화 |
| `loadMarkdown(scope: RepositoryScope) -> Result[SourceBundle]` | 공개 저장소 기본 브랜치의 지정 폴더 아래 Markdown 집합 읽기 |

폴더가 존재하지만 Markdown이 없는 결과는 빈 SourceBundle로 표현하고, 폴더 접근 실패는 AppError로 구분한다. 폴더 탐색 방법, 하위 경로 처리와 GitHub 요청 상세는 구현 전에 구체화한다.

## C4 QuestionParser

| 메서드 | 목적 |
| --- | --- |
| `parse(document: SourceDocument) -> ParseResult` | 질문·선택지·답변과 위치 정보 추출; 잘못된 영역은 경고와 함께 처리 |

## C5 MarkdownRenderer

| 메서드 | 목적 |
| --- | --- |
| `render(markdown: String) -> Result[SafeHtml]` | 위험한 HTML·스크립트가 실행되지 않는 본문 생성 |

## C6 DecisionStore

| 메서드 | 목적 |
| --- | --- |
| `getRecentConnection() -> Result[Optional[ConnectionInput]]` | 저장된 최근 연결 읽기 |
| `saveRecentConnection(input: ConnectionInput) -> Result[Void]` | 검증되고 읽기에 성공한 연결 정보 저장 |
| `listDecisions(documents: List[DocumentKey]) -> Result[List[SavedDecision]]` | 해당 저장소·문서들의 기존 결정 조회 |
| `saveDecisions(decisions: List[SavedDecision]) -> Result[List[SavedDecision]]` | 하나의 확정 동작을 SQLite 트랜잭션으로 저장 |

SQLite 파일 열기·초기화 및 스키마는 코드 생성 전에 정의한다. 이 저장 인터페이스의 오류는 AppError로 전달하며 저장되지 않은 값을 완료로 응답하지 않는다.

## C7 MarkdownExporter

| 메서드 | 목적 |
| --- | --- |
| `export(document: SourceDocument, parsed: ParseResult, decisions: List[SavedDecision]) -> Result[DownloadFile]` | 검증된 답변 위치에 확정 답변을 반영하고 문서 한 개의 다운로드 생성 |

## 공통 계약

- UI가 제공하는 문서·질문 식별자는 활성 ReviewContext에 속하는지 C2에서 검증한다. 클라이언트 원문 위치와 SQL은 받지 않는다.
- 유효하지 않거나 만료된 SnapshotId는 다시 연결할 수 있는 오류로 반환한다. 재시작 후 저장 결정은 새 컨텍스트에 다시 연결한다.
- C2는 저장 후보를 전부 검증한 뒤 C6을 호출하며, C6은 일괄 저장 전체가 성공한 경우에만 성공을 반환한다.
- 파싱 경고와 사용자에게 표시할 일반 오류를 구분한다. 저장 실패 시 임시 선택을 화면에 남겨 사용자가 다시 확정할 수 있게 한다.
- 상세 문법, 중복 번호 처리, 저장 결정과 원문 답변의 우선순위, 원문 변경 판정은 Functional Design에서 정의한다.
