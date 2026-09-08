# PlanRepo 도메인과 저장 모델

## 기준

[알고리즘](business-logic-model.md), [규칙](business-rules.md), [상위 타입 계약](../../../inception/application-design/component-methods.md)을 따른다. Q1=A의 질문 단위 재사용과 Q2=A의 원문 우선 정책을 적용한다. 아래는 논리 데이터 모델이며 실행 SQL은 Code Generation에서 작성한다.

## 엔터티와 수명

| 엔터티 | 주요 필드 | 관계·수명 |
| --- | --- | --- |
| ConnectionInput | repositoryUrl, folderPath | 사용자 입력, 최근 성공 입력만 영속화 |
| RepositoryScope | repositoryKey, canonicalUrl, folderPath | 현재 연결 범위, C3가 검증·정규화 |
| SourceBundle | scope, defaultBranch, resolvedRevision, documents | 한 번 조회한 문서 집합, C2 메모리 |
| SourceDocument | documentKey, repositoryKey, relativePath, sourceBytes, sourceVersion | 원문 UTF-8·버전, C2 메모리 |
| ParsedQuestion | questionKey, documentKey, number, prompt, options, sourceAnswer, canonicalIdentity, identityDigest, answerSpan, lineNumber | 유효하고 유일한 질문, 현재 원문에 종속 |
| Option | letter, content | 질문당 순서 있는 두 개 이상, 대문자 문자 유일 |
| ParseResult | questions, warnings | 문서당 하나, 모호한 반복 그룹은 questions에서 제외 |
| Warning | code, documentKey, lineNumber, message | 현재 파싱·병합 경고, 영속화하지 않음 |
| ReviewContext | snapshotId, sourceBundle, parseResults | C2가 소유하는 활성 컨텍스트 하나, 재연결·재시작 시 교체 |
| AnswerSelection | questionKey, optionLetter | C1의 미확정 값, 확정 요청에만 전달 |
| SavedDecision | documentKey, questionKey, identityVersion, identityDigest, canonicalIdentity, selectedLetter, decidedAt, sourceVersionAtDecision, uniqueAtDecision | C6의 영속 확정 결정 |
| EffectiveQuestion | parsedQuestion, status, effectiveAnswer, answerOrigin, warnings | 현재 원문·SavedDecision에서 계산, 영속화하지 않음 |
| RecentConnection | singletonId, canonicalUrl, repositoryKey, folderPath, updatedAt | 최근 성공한 연결 하나, C6 영속화 |

sourceAnswer는 답변 줄의 원문 값이며 유효 상태 계산에만 양끝 공백을 제거한다. sourceBytes와 표시용 SafeHtml을 섞지 않는다. uniqueAtDecision은 유일한 질문에서 저장했다는 검증 정보이며 항상 참인 정상 결정만 생성한다.

## 키와 관계

- RepositoryKey는 정규화된 GitHub owner/repository 식별이다. 대소문자 차이·URL의 마지막 슬래시·선택적 `.git` 접미사는 같은 저장소로 정규화한다. 소유자·저장소 변경의 자동 이전은 없다.
- DocumentKey는 RepositoryKey와 저장소 상대 경로의 구조화된 쌍이다. 경로 대소문자를 보존한다. 선택한 폴더는 탐색 범위이므로 같은 파일을 포함하는 다른 폴더로 연결해도 문서 키는 같다.
- QuestionKey는 DocumentKey, identityVersion, identityDigest의 구조화된 조합이다. 서버가 생성·검증하며 클라이언트가 원문 위치를 대신 전달할 수 없다. 비교 정보 일치 확인으로 다이제스트 충돌을 거부한다.
- canonicalIdentity는 번호·질문 문구·순서 있는 선택지 내용의 비교용 구조다. 전체 문서·답변 값·줄 위치는 포함하지 않는다. 정규화는 알고리즘 문서와 같으며 버전이 다르면 재사용하지 않는다.
- SnapshotId는 활성 조회 핸들이다. QuestionKey를 재사용할 수 있어도 이전 SnapshotId를 사용한 요청은 거부한다. 인증·영속 식별자로 사용하지 않는다.
- 저장소 하나에 문서 여러 개, 문서 하나에 현재 질문 여러 개가 속한다. 각 질문 버전에는 로컬 결정이 최대 하나다. 문서의 이전 질문 버전 결정들은 삭제하지 않고 함께 보존한다.

## 원문 위치 모델

answerSpan은 원문 UTF-8 바이트 기준 반열린 범위다. 답변 줄 시작, 콜론 뒤 시작, 값 범위, 줄 끝과 삽입 위치를 갖는다. 삽입 위치는 빈 답변의 기존 수평 공백 뒤·줄 끝 문자 앞이다. lineNumber는 사용자 표시용 1부터 시작한다. 브라우저 문자열 인덱스와 바이트 오프셋을 혼용하지 않는다.

sourceVersion은 조회 버전 식별과 정확한 원문 바이트 다이제스트를 가진다. C7은 현재 SourceDocument와 ParseResult의 버전·범위·예상 답변 줄이 일치하는지 확인한다. 저장 당시 sourceVersionAtDecision은 검증 근거이며 Q1=A에서는 문서 전체가 같아야 하는 재사용 조건이 아니다.

## SQLite 논리 테이블

| 테이블 | 키·유일성 | 필드·제약 |
| --- | --- | --- |
| recent_connection | singleton_id 기본 키, 고정값 1 | repository_key, canonical_url, folder_path, updated_at 필수; folder_path는 루트일 때 빈 문자열 허용 |
| decisions | repository_key + document_path + identity_version + identity_digest 복합 기본 키 | question_key, canonical_identity, selected_letter, decided_at, source_version_at_decision, unique_at_decision 필수 |

selected_letter는 ASCII 대문자 한 글자이며 현재 선택지 소속 검증은 C2가 한다. decided_at과 updated_at은 서버 UTC ISO 8601 문자열이다. canonical_identity는 비교 가능한 버전 있는 직렬화 데이터다. DB에는 질문 원문 연결 검증에 필요한 문구·선택지 비교 정보를 저장하지만 문서 전체·파싱 트리·SafeHtml·미확정 선택은 저장하지 않는다.

문서 목록 자체를 영속 테이블로 만들지 않으므로 문서 외래 키나 원문 삭제 시 연쇄 삭제는 없다. source_version_at_decision의 조회 버전·다이제스트 필드 표현과 파일 경로·스키마 초기화 SQL은 코드 생성 계획에서 구체화한다.

## 트랜잭션 경계

- 최근 연결 저장은 성공적으로 읽고 파싱·결정 조회를 마친 새 연결에 대해 단일 행을 교체하는 트랜잭션이다. 실패하면 C2가 컨텍스트를 교체하지 않는다.
- 일괄 확정은 모든 질문의 신규 삽입·기존 동일 답변 확인을 한 트랜잭션에서 수행한다. 비교 정보나 기존 선택값 충돌이면 전체 롤백한다. 일반적인 덮어쓰기 upsert로 완료 답변을 변경하지 않는다.
- 같은 답변 재요청은 기존 SavedDecision을 반환하여 결정 시각을 유지한다. 성공 응답은 커밋 후 실제 행에서 만든다.
- 저장 결정 조회 실패를 결정 없음으로 취급하지 않는다. 결정 조회와 내보내기는 로컬 데이터를 삭제·수정하지 않는다.

## 화면 전송 모델

WorkspaceView에는 snapshotId, connection, 문서별 경로·유효 미결정/완료 건수, unresolved 질문 목록과 경고가 있다. DocumentView에는 documentKey, SafeHtml, 해당 문서 EffectiveQuestion과 경고가 있다. 완료 건수는 source_answered와 local_confirmed만 센다. 파싱 제외 영역은 별도 경고이므로 미결정 0개여도 경고가 있음을 표시한다.

CommitResult에는 실제 저장·재확인한 SavedDecision 목록과 최신 WorkspaceView가 있다. DownloadFile은 파일명·UTF-8 Markdown·콘텐츠 유형을 가진다. AppError는 code, message, retryable을 제공한다. 내부 비교 정보·원문 바이트 위치를 UI가 신뢰 판단이나 저장 값 생성에 사용하지 않는다.

## 범위와 확장 준수

단일 `planrepo` 로컬 앱, 전체 MVP 1.5일, 핵심 경로 스모크 테스트만 유지한다. 기술 스택은 NFR Requirements에서 결정한다. 실제 HTTP 경로·SQL·실행 명령은 Code Generation 계획으로 넘긴다.

| 확장 | Enabled | 규칙별 결과 | 근거 |
| --- | --- | --- | --- |
| Security Baseline | No | 전체 규칙 N/A | 비활성. 승인된 입력·호스트 검증과 안전한 렌더링은 유지 |
| Property-Based Testing | No | 전체 규칙 N/A | 비활성. 스모크 테스트만 수행 |
| Resiliency Baseline | No | 전체 규칙 N/A | 비활성. 성능·확장성·고가용성·복원력 설계 제외 |

활성 확장 차단 항목은 없다. 이 산출물은 설계이며 구현·동작 테스트 통과를 의미하지 않는다.
