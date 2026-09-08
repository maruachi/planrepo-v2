# PlanRepo Units Generation 계획

## 상태와 근거

- 상태: Part 1 계획과 Part 2 산출물 모두 승인 완료. Functional Design으로 전환.
- 기준: [요구사항](../requirements/requirements.md), [스토리](../user-stories/stories.md), [페르소나](../user-stories/personas.md), [실행 계획](execution-plan.md), [승인된 애플리케이션 설계](../application-design/application-design.md).
- Application Design은 2026-09-08 사용자 재개 요청으로 승인되었다.
- 기존에 승인된 단일 `planrepo` 단위 안에서 US-01~US-05와 C1~C7을 묶는다. 이번 계획은 그 경계와 매핑을 필수 문서 3개로 정리하기 위한 것이다.
- 생성 계획은 2026-09-08 사용자가 작성한 `[Answer]:A`와 “진행해줘.” 요청으로 승인되었다. 생성된 산출물의 단계 승인은 별도로 받는다.

## 계획 준비 체크리스트

- [x] 1. 상태·감사 기록과 이전 요구사항·스토리·설계 산출물을 확인한다.
- [x] 2. Application Design 승인을 기록하고 관련 체크박스를 갱신한다.
- [x] 3. 분해 질문 범주 6개를 검토하고 기존 결정의 근거 및 추가 질문 필요성을 기록한다.
- [x] 4. 단위 경계, 구성 요소·스토리 매핑, 의존성과 코드 배치 전략을 계획한다.
- [x] 5. 필수 산출물 3개의 생성 순서와 검증 기준을 작성하고 Markdown 구문을 확인한다.
- [x] 6. 상태와 감사 기록을 갱신하고 아래 계획 승인 질문을 제시한다.
- [x] 7. 사용자의 계획 승인 또는 수정 응답을 기록하고 Part 2 생성으로 전환한다.

## 분해 범주 검토

| 범주 | 결정과 근거 | 추가 확인 필요성 |
| --- | --- | --- |
| 스토리 그룹 | 실행 계획에 따라 US-01~US-05 모두 `planrepo`에 배정 | 없음: 단위 수와 그룹이 이미 승인됨 |
| 의존성 | 다른 구현 단위 없음. C1에서 C2로, C2에서 C3~C7로 호출. GitHub 읽기와 SQLite만 외부·저장 경계 | 없음: 기존 구성 요소 의존성 문서 유지 |
| 팀 정렬 | 단일 단위의 순차 구현. 조직·개인 소유자 지정 없이 전체 앱을 하나의 작업 범위로 관리 | 없음: 실행 계획에서 멀티 에이전트 작업을 계획하지 않음 |
| 기술 고려 | 단일 로컬 앱, SQLite 파일 하나. 배포·성능·확장성·고가용성 제외 | 없음: 승인된 제약 유지, 스택은 NFR Requirements에서 결정 |
| 업무 도메인 | 문서 검토와 의사결정의 하나의 사용자 여정으로 구성. 내부 책임만 모듈로 구분 | 없음: 단일 페르소나와 승인된 상위 설계로 경계 확정 |
| 코드 조직 | Greenfield 단일 단위이므로 루트의 `src/`, `tests/`, 필요 시 `config/` 사용 | 다중 단위 조직 질문은 N/A. 언어별 파일명은 Code Generation 계획에서 확정 |

기존 결정을 다시 선택하게 하는 질문은 만들지 않는다. 생성 계획의 승인 답변 A를 검증했고 모순이나 모호성이 없다. 질문 식별·원문 변경·결정 병합 규칙은 예정된 Functional Design에서 정의하며 단위 분해를 막는 누락으로 취급하지 않는다.

## 생성할 단위 정의

| 항목 | 내용 |
| --- | --- |
| 단위 ID | `planrepo` |
| 목적 | 공개 GitHub Markdown 탐색부터 미결정 질문의 답변 확정·보존·다운로드까지 완성 |
| 형태 | 브라우저 UI와 로컬 앱 프로세스를 포함한 단일 구현 단위 |
| 사용자 | P-01 로컬 문서 검토자 |
| 포함 요구사항 | FR-1, FR-2, FR-3, FR-4, FR-5, FR-6 |
| 영속 데이터 | 최근 연결, 문서별 질문 식별자, 선택 답변, 결정 시각 및 원문 연결 검증 정보 |
| 임시 데이터 | C1의 미확정 선택, C2의 원문·파싱 결과·조회 컨텍스트 |
| 외부 경계 | C3의 공개 GitHub 읽기, C6의 로컬 SQLite 접근 |
| 제외 범위 | 인증·비공개 저장소·GHE·원격 쓰기·다중 사용자·댓글·LLM·외부 배포·복원력 설계 |

### 구성 요소 배정

| 구성 요소 | 책임 | 소속 단위 |
| --- | --- | --- |
| C1 ReviewUI | 연결 입력, 문서 열람, 질문 선택, 확정과 다운로드 | planrepo |
| C2 PlanRepoService | 검증, 문서·질문·저장 결정 조정, 결과 반환 | planrepo |
| C3 GitHubSource | 공개 저장소 기본 브랜치와 문서 폴더 읽기 | planrepo |
| C4 QuestionParser | 질문·선택지·답변 위치 추출과 경고 | planrepo |
| C5 MarkdownRenderer | 안전한 본문 HTML 생성 | planrepo |
| C6 DecisionStore | 최근 연결 및 확정 답변의 SQLite 저장 | planrepo |
| C7 MarkdownExporter | 원문 답변 위치에 확정 결정을 반영 | planrepo |

### 스토리 배정

| 스토리 | 요구사항 | 주요 구성 요소 | 단위 |
| --- | --- | --- | --- |
| US-01 공개 저장소와 문서 폴더 연결 | FR-1, FR-2 | C1, C2, C3 | planrepo |
| US-02 Markdown 문서 탐색 및 열람 | FR-2 | C1, C2, C3, C5 | planrepo |
| US-03 미결정 질문 대기열 확인 | FR-3, FR-4 | C1, C2, C4, C6 | planrepo |
| US-04 답변 선택, 일괄 확정 및 유지 | FR-4, FR-5, FR-6 | C1, C2, C4, C6 | planrepo |
| US-05 답변이 반영된 Markdown 내보내기 | FR-5, FR-6 | C1, C2, C6, C7 | planrepo |

단위 간 의존성 표는 `planrepo` 한 행·한 열이며 자기 의존성은 없음으로 표시한다. 단위 내부 호출 관계와 GitHub·SQLite 경계는 별도 표로 구분한다. 공유 DB를 사용하는 다른 서비스나 단위 간 통신은 도입하지 않는다.

## Part 2 생성 체크리스트

아래 작업은 계획 승인 이후 순서대로 실행한다. 출력 파일은 모두 `aidlc-docs/inception/application-design/` 아래에 작성한다.

- [x] 1. 승인 응답과 이 계획 전체를 읽고 첫 미완료 생성 항목을 확인한다.
- [x] 2. `unit-of-work.md`를 생성한다.
  - [x] `planrepo`의 목적, 책임, C1~C7, 데이터 소유권, 입력·출력과 제외 범위를 정의한다.
  - [x] Greenfield 단일 단위 코드 배치 전략을 명시한다. 애플리케이션 소스·테스트·설정은 작업공간 루트 아래, 문서는 `aidlc-docs/`에 둔다.
  - [x] 단위 내 구현 순서를 실행 골격·SQLite 초기화, 연결·열람, 파싱·대기열, 확정·재조회, 내보내기, 스모크 검증으로 기술한다.
- [x] 3. `unit-of-work-dependency.md`를 생성한다.
  - [x] 단위 의존성 행렬과 다른 단위 의존성 없음의 근거를 작성한다.
  - [x] C1 → C2 → C3~C7 내부 호출, C3 → GitHub 읽기, C6 → SQLite 접근을 표와 문장으로 구분한다.
  - [x] GitHubSource와 DecisionStore의 결과가 PlanRepoService에서 결합됨을 명시한다.
- [x] 4. `unit-of-work-story-map.md`를 생성한다.
  - [x] US-01~US-05 각각을 `planrepo` 한 곳에 배정하고 FR-1~FR-6과 구성 요소를 연결한다.
  - [x] 스토리 인수 조건 원본을 참조하고 핵심 스모크 흐름과 연결한다. 구현 완료 체크박스는 변경하지 않는다.
- [x] 5. 산출물의 경계·의존성과 추적성을 검증한다.
  - [x] C1~C7 누락 없음, 스토리 5개가 각각 정확히 한 단위에 배정됨, 요구사항 6개가 모두 포함됨을 확인한다.
  - [x] 순환 호출 없음, 원격 쓰기 없음, SQLite 소유권과 임시 상태 경계의 설계 일치를 확인한다.
  - [x] 로컬 단일 앱·1.5일·스모크 테스트 제한 및 비활성 확장 결정을 확인한다.
  - [x] 모든 문서의 Markdown 표·코드 블록·상대 링크를 확인한다. 도식은 필요한 경우에만 검증 후 추가하고 텍스트 대안을 포함한다.
- [x] 6. 상태·계획 체크박스·감사 기록에 생성 완료를 반영하고 단위 산출물 검토를 요청한다.
- [x] 7. 단위 산출물에 대한 사용자 승인을 기록하고 Functional Design으로 이동한다.

## 확장 규칙 준수

| 확장 | Enabled | 규칙별 결과 | 근거 |
| --- | --- | --- | --- |
| Security Baseline | No | 전체 규칙 N/A | 승인된 비활성 상태 유지, 전체 규칙 미로드·미적용. FR-2와 최소 입력·호스트 검증은 유지 |
| Property-Based Testing | No | 전체 규칙 N/A | 핵심 경로 스모크 테스트만 수행하도록 승인됨 |
| Resiliency Baseline | No | 전체 규칙 N/A | 성능·확장성·고가용성·복원력 설계가 제외됨 |

활성 확장에 의한 차단 항목은 없다. 이번 검증은 계획 문서에 대한 확인이며 코드 동작 검증은 후속 단계다.

## 계획 승인

### Question 1

**Unit of work plan complete. Review the plan in aidlc-docs/inception/plans/unit-of-work-plan.md. Ready to proceed to generation?**

위 계획으로 단일 `planrepo` 단위의 필수 문서 3개를 생성해도 됩니까?

A) Approve & Continue — 계획을 승인하고 단위 문서 생성 진행

B) Request Changes — 생성 전에 계획 수정 요청, 수정 내용을 답변에 기재

X) Other (please describe after [Answer]: tag below)

[Answer]:A

## 생성 결과와 단계 승인

필수 문서 3개를 생성했으며 구성 요소·스토리·요구사항 매핑, 직접 호출 의존성의 원본 일치와 비순환성, Markdown 표·상대 링크를 검증했다. 스토리 인수 조건은 구현 전이므로 미완료 상태를 유지했다. 2026-09-08 재개 시 [산출물 검토 질문](units-generation-review-questions.md)의 사용자 답변 `[Answer]:A`를 확인했다. 단위 산출물 승인을 기록하고 Functional Design으로 이동했다.
