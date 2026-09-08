# PlanRepo 화면 기능 설계

## 기준과 구조

P-01 로컬 문서 검토자의 US-01~US-05를 하나의 ReviewUI(C1)로 제공한다. [상위 메서드](../../../inception/application-design/component-methods.md), [기능 흐름](business-logic-model.md), [업무 규칙](business-rules.md), [데이터 모델](domain-entities.md)을 따른다.

ReviewPage가 연결 폼, 전체 오류·경고, 문서 목록·본문, 전체 미결정 대기열, 일괄 확정 영역을 소유한다. DocumentViewer 아래에는 문서별 결정 상태와 다운로드 버튼을 둔다. 각 DecisionQueueItem은 질문 문구, 원본 문서 이동, 선택지 라디오 그룹을 가진다. 이 계층은 논리 책임이며 프레임워크·실제 파일 분할을 강제하지 않는다.

## 컴포넌트 props·state

| 컴포넌트 | 입력 props | 자체 state·이벤트 |
| --- | --- | --- |
| ReviewPage | 초기 입력 조회 결과 | workspace, selectedDocumentKey, documentView, pendingSelections, requestSequence, loading/error; C2 호출 조정 |
| ConnectionForm | 최근 입력, activeConnection, busy | repositoryUrl, folderPath, fieldErrors; onConnect |
| DocumentList | documentSummaries, selectedDocumentKey, disabled | 자체 도메인 상태 없음; onSelectDocument |
| DocumentViewer | safeHtml, effectiveQuestions, loading, error | 표시 상태만 유지; 원문 HTML 재작성·질문 파싱 없음 |
| DecisionQueue | unresolvedQuestions, pendingSelections, disabled | 자체 복사본 없음; 항목 선택 이벤트 전달 |
| DecisionQueueItem | questionKey, documentPath, prompt, options, selectedLetter, disabled | onSelectAnswer, onOpenDocument; 한 질문당 하나의 라디오 선택 |
| ConfirmBar | selectedCount, busy, commitError | onConfirm; 저장 중 표시 |
| ExportButton | selectedDocumentKey, snapshotId, disabled | downloading, exportError; onDownload |
| WarningPanel | 문서·줄·이유를 가진 경고 목록 | 문서 열기 이벤트; 경고 내용 텍스트 표시 |
| StatusMessage | loading, emptyState, error | 진행·빈 상태·실패 안내 |

pendingSelections는 QuestionKey→선택 문자 맵 하나로 ReviewPage가 소유한다. 각 하위 컴포넌트는 전달된 값으로 렌더링한다. source_answered와 local_confirmed는 완료 상태로 표시하고 대기열에서 제외한다. 질문 본문 뷰어는 원문을 보여주므로 빈 `[Answer]:`와 로컬 완료 표시가 동시에 보일 수 있다. ‘로컬에 확정됨’ 문구로 이를 설명한다.

## 상호작용과 API 연동

아래 메서드는 C2의 기존 서비스 계약이다. 실제 HTTP 경로·요청 직렬화는 스택 선택 후 Code Generation 계획에서 정한다. UI는 C2만 호출하며 GitHub·SQLite 접근은 하지 않는다.

| 이벤트·담당 | 서비스 호출 | 성공 결과 | 실패 결과 |
| --- | --- | --- | --- |
| 페이지 초기화, ReviewPage | getRecentConnection() | 입력란 복원 | 오류 안내와 수동 입력 가능 |
| 연결·재조회, ConnectionForm | connect(input) | 새 workspace 적용, 임시 선택 초기화, 첫 문서 선택 후 본문 조회 | 이전 workspace·선택 유지 |
| 전체 상태 재확인, ReviewPage | getWorkspace(snapshot) | 서버 상태 반영, 완료된 임시 선택 제거 | 이전 화면과 오류 유지 |
| 문서 선택, DocumentList | getDocument(snapshot, document) | safeHtml·문서 상태 표시 | 해당 문서 오류, 대기열 유지 |
| 답변 선택, DecisionQueueItem | 호출 없음 | pendingSelections 갱신 | 선택지 외 값은 수용하지 않음 |
| 일괄 확정, ConfirmBar | commitAnswers(snapshot, selections) | 서버 상태 반영, 성공 항목 임시 선택 제거 | 임시 선택과 오류 유지 |
| 문서 다운로드, ExportButton | exportDocument(snapshot, document) | 파일 한 개 다운로드 | 다운로드 오류 표시 |

문서 선택 변경은 임시 선택을 지우지 않는다. 모든 문서의 선택을 모아 한 번에 확정할 수 있다. 확정 중에는 답변 변경·연결·다운로드를 비활성화하여 현재 요청의 결과를 일관되게 적용한다. 선택 0개일 때 확정 버튼을 비활성화한다. 다운로드는 미확정 선택이 있어도 가능하며 ‘확정된 답변만 포함’이라고 표시한다.

재연결 성공 시 임시 선택이 초기화된다는 짧은 안내를 연결 버튼 근처에 표시한다. 별도 확인 모달은 추가하지 않는다. 연결 중에는 중복 제출과 확정을 비활성화한다. 실패하면 기존 입력 시도값·이전 활성 데이터·임시 선택을 남긴다. 성공한 빈 폴더는 문서 선택과 다운로드를 비활성화하고 ‘Markdown 문서 없음’을 표시한다.

문서 전환 응답은 requestSequence와 요청 당시 snapshot·document를 현재 값과 대조해 늦게 도착한 다른 문서 응답을 적용하지 않는다. 재연결·만료 후의 오래된 확정 결과도 현재 화면에 섞지 않고 현재 상태를 재확인한다. 페이지 새로고침·앱 재시작 후 미확정 선택 복원은 하지 않는다.

## 폼 검증과 표시

- repositoryUrl은 필수다. `https://github.com/owner/repository` 형태의 저장소 URL을 받으며 마지막 슬래시·`.git`는 정규화한다. 계정정보·쿼리·fragment·추가 tree/blob 경로는 오류로 안내한다.
- folderPath는 저장소 상대 경로다. 빈 값·`.`는 루트로 정규화하고 앞뒤 공백·마지막 슬래시를 정리한다. 절대 경로·역슬래시·상위 이동 `..`·제어문자는 거부한다. 하위 폴더도 읽는다고 안내한다.
- UI 검증은 빠른 피드백용이며 C3/C2 서버 검증을 생략하지 않는다. 구체적인 URL·네트워크 호스트 검증은 NFR Design에서 확정한다.
- 질문·선택지·원문 답변·오류·경고는 텍스트로 표시한다. 원문 본문에만 C5 SafeHtml을 사용한다. 선택지에 포함된 Markdown은 기본 텍스트로도 읽을 수 있게 한다.
- 라디오 그룹에 질문 이름과 선택지 레이블을 연결하고 키보드로 선택·확정할 수 있게 한다. 저장 중·오류·완료 상태는 텍스트로 명시한다.
- 파싱 경고, 저장 답변 미연결 안내, 원문/로컬 충돌을 문서·줄 정보와 함께 표시한다. 충돌에서는 원문 답변을 적용한다는 설명을 제공한다.

## 주요 화면 상태

| 상태 | 사용자 표시·가능한 동작 |
| --- | --- |
| 연결 전 | 최근 입력 또는 빈 폼, 연결 가능 |
| 로딩 | 읽는 중 표시, 기존 결과가 있다면 이전 연결 정보와 함께 유지 |
| 문서 없음 | 정상 빈 폴더 안내, 다시 연결 가능 |
| 미결정 없음 | 유효한 미결정 질문 없음, 파싱 경고가 있으면 함께 표시 |
| 질문 선택 중 | 선택 개수와 일괄 확정, 문서 전환 가능 |
| 확정 성공 | 완료 반영, 다운로드 가능 |
| 확정 실패 | 선택 유지, 오류 수정·재시도 가능 |
| 컨텍스트 만료 | 재연결 안내, 이전 선택을 새 질문에 자동 적용하지 않음 |
| 렌더링·내보내기 실패 | 작업별 오류 표시, 안전하지 않은 대체 출력을 만들지 않음 |

원문·로컬 완료 답변 편집, 자유서술, 댓글, 다중 사용자, 충돌 해결 전용 화면, ZIP 다운로드는 추가하지 않는다.

## 범위와 확장 준수

단일 `planrepo` 로컬 앱, 전체 MVP 1.5일, 핵심 경로 스모크 테스트만 유지한다. 기술 스택은 NFR Requirements에서 결정한다. 실제 HTTP 경로·SQL·실행 명령은 Code Generation 계획으로 넘긴다.

| 확장 | Enabled | 규칙별 결과 | 근거 |
| --- | --- | --- | --- |
| Security Baseline | No | 전체 규칙 N/A | 비활성. 승인된 입력·호스트 검증과 안전한 렌더링은 유지 |
| Property-Based Testing | No | 전체 규칙 N/A | 비활성. 스모크 테스트만 수행 |
| Resiliency Baseline | No | 전체 규칙 N/A | 비활성. 성능·확장성·고가용성·복원력 설계 제외 |

활성 확장 차단 항목은 없다. 이 산출물은 설계이며 구현·동작 테스트 통과를 의미하지 않는다.
