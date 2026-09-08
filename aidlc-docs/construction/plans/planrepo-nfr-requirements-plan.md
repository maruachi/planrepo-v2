# PlanRepo NFR Requirements 계획

## 상태와 기준

- 상태: 사용자 지정 TypeScript + Fastify + Vue.js를 반영한 NFR 산출물 2개 작성·검증 완료. [산출물 검토](planrepo-nfr-requirements-review-questions.md) 승인 완료: 사용자 채팅 `진행해줘.` (2026-09-08).
- 선행 승인: 2026-09-08 [Functional Design 검토](planrepo-functional-design-review-questions.md)의 사용자 답변 A 확인. 기능 설계 계획의 13번과 단계 체크박스 완료.
- 기준: [요구사항](../../inception/requirements/requirements.md), [스토리](../../inception/user-stories/stories.md), [실행 계획](../../inception/plans/execution-plan.md), [단위 정의](../../inception/application-design/unit-of-work.md), [단위 의존성](../../inception/application-design/unit-of-work-dependency.md), [스토리 매핑](../../inception/application-design/unit-of-work-story-map.md).
- 기능 설계: [알고리즘](../planrepo/functional-design/business-logic-model.md), [업무 규칙](../planrepo/functional-design/business-rules.md), [도메인 모델](../planrepo/functional-design/domain-entities.md), [화면 설계](../planrepo/functional-design/frontend-components.md).
- 깊이: 최소. 전체 MVP 1.5일, 로컬 단일 사용자·단일 앱, SQLite, 공개 GitHub 기본 브랜치 읽기, 핵심 경로 스모크 테스트.

## 실행 체크리스트

- [x] 1. Functional Design 산출물 승인 A를 검증하고 상세 계획·상태·실행 계획·감사 기록을 갱신한다.
- [x] 2. 기능 설계 4개와 선행 요구사항·스토리·상위 계약을 읽고 NFR 영향과 단위 경계를 분석한다.
- [x] 3. NFR 질문 범주 8개를 평가하고 기존 결정과 제외 범위를 유지한다.
- [x] 4. 미정 기술 스택의 권장안·대안, 준비 조건과 근거를 정리하고 질문 1개를 작성한다.
- [x] 5. 계획의 Markdown·표·링크·질문 형식을 검증하고 저장한다. 상태·감사 기록에 답변 대기를 반영한다.
- [x] 6. 아래 답변을 읽고 완전성·유효성·기존 제약과의 일관성을 검증한다. 불명확하거나 모순된 내용만 후속 질문한다.
- [x] 7. `aidlc-docs/construction/planrepo/nfr-requirements/nfr-requirements.md`를 작성한다.
  - [x] 최소 NFR에 ID를 부여하고 요구사항·업무 규칙·담당 구성 요소·관찰 가능한 스모크 확인을 연결한다.
  - [x] 실행성, 입력·호스트 검증, 안전한 렌더링, 영속화·원자성, 오류·화면 동작을 구체화한다.
  - [x] 성능·확장성·고가용성·복원력·속성 기반 테스트와 비활성 확장을 N/A로 기록한다.
- [x] 8. `aidlc-docs/construction/planrepo/nfr-requirements/tech-stack-decisions.md`를 작성한다.
  - [x] 승인된 스택과 C1~C7 구현 책임, 런타임·의존성·개발 환경 준비 조건을 명시한다.
  - [x] Markdown 블록 분석·렌더링, GitHub HTTP 읽기, SQLite, 스모크 도구의 선택과 대안·근거를 기록한다.
  - [x] 단일 명령 실행 준비 전략, 버전 고정·재현 방식, NFR Design 및 Code Generation에 넘길 결정을 구분한다.
- [x] 9. 두 산출물의 추적성·상호 일관성·출처·Markdown·표·링크와 승인 범위 유지를 검증한다. 도식 추가 시 구문 검증과 텍스트 대안을 제공한다.
- [x] 10. 계획·상태·감사 기록을 갱신하고 표준 Request Changes / Continue to Next Stage 형식으로 NFR 산출물 검토를 요청한다.
- [x] 11. NFR Requirements 산출물 승인을 기록하고 단계 체크박스를 완료한 뒤 NFR Design으로 이동한다.

## 질문 범주 평가

| 범주 | 기존 근거와 처리 | 추가 질문 |
| --- | --- | --- |
| Scalability | 성능·확장성 설계 제외, 단일 사용자·활성 저장소 하나. 사용자 수·성장률·분산 구조 목표 추가 없음 | 없음: 승인된 제외 |
| Performance | 응답 시간·처리량 목표와 부하 테스트 제외. 읽기 실패와 진행 상태는 기존 오류·UI 계약으로 처리 | 없음: 승인된 제외 |
| Availability | 고가용성·재해 복구·외부 배포 제외. 앱 종료 후 SQLite 결정 유지 요구만 적용 | 없음: 승인된 제외 |
| Security | 토큰 미수집, 서버 입력 검증, GitHub 외 임의 호스트 요청 금지, 위험한 HTML·스크립트 비실행, 내부 스택 비노출 | 없음: 기존 최소 요구사항 |
| Tech Stack Selection | SQLite·브라우저 UI·로컬 프로세스 하나는 확정. 구현 언어·웹 프레임워크·개발 도구 선호는 미정 | Q1 |
| Reliability | BR-02, BR-08~BR-11의 기존 상태 유지·전체 롤백·동일 답변 재요청·원문 보존. 별도 재시도 서비스·모니터링 없음 | 없음: 기능 설계로 확정 |
| Maintainability | C1~C7 책임 구분, 실행 안내, 핵심 경로 스모크만 필요. 언어별 의존성·도구는 Q1에 맞춰 선택 | Q1로 충족 |
| Usability | 단일 화면 흐름, 키보드 라디오 선택, 진행·빈 상태·경고·오류 표시, 실패 시 임시 선택 유지가 확정 | 없음: 화면 설계로 확정 |

확장 선택, 데이터베이스, 공개 저장소 범위와 실행 형태를 다시 질문하지 않는다. 처리 시간 수치나 지원 용량 목표를 새로 요구하지 않는다.

## 최소 NFR 평가 초안

아래는 기존 승인 내용을 다음 산출물로 옮기기 위한 평가다. 새 단계의 산출물 승인 완료를 뜻하지 않는다.

| 영역 | 유지할 조건 | 책임·근거 | 후속 확인 |
| --- | --- | --- | --- |
| 로컬 실행 | 런타임 준비 안내와 단일 시작 명령, 앱 프로세스 하나, 별도 클라우드·DB 서버 없음 | 전체, 실행성 요구·단위 정의 | 안내대로 시작하여 브라우저 접근 |
| 데이터 지속성 | 최근 성공 연결과 확정 결정만 SQLite에 유지, 원문·미확정 선택은 임시 | C2, C6, FR-5·FR-6 | 재시작·재연결 후 복원 |
| 확정 일관성 | 전체 후보 검증 후 한 트랜잭션, 실패 시 전체 롤백, 같은 답변 재요청은 기존 시각 유지 | C2, C6, BR-08·BR-09 | 핵심 저장 흐름 안에서 성공·실패·재요청 확인 |
| 원문 정확성 | 유일한 질문 내용 일치, 비어 있지 않은 원문 답변 우선, 내보내기 답변 위치 외 바이트 보존 | C2, C4, C7, BR-05·BR-06·BR-11 | 재조회·다운로드·재파싱 |
| 외부 읽기 경계 | 서버 입력 검증, 공개 GitHub 읽기만, 임의 호스트로 우회 요청 금지, 계정·토큰 없음 | C2, C3, FR-1·최소 보안 | 유효 연결과 잘못된 호스트 거부 |
| 표시 안전성 | 본문은 안전한 HTML, 질문·선택지·경고·오류는 텍스트, 내부 스택 비노출 | C1, C2, C5, FR-2·BR-12 | 문서 열람 흐름에 위험한 HTML 사례 포함 |
| 실패·상태 전달 | 빈 폴더와 접근 실패 구분, 코드·메시지·재시도 가능 여부, 연결 실패 시 기존 상태 유지 | C1~C6, 오류 계약·BR-02 | 동일 스모크에서 주요 실패 표시 |
| 조작성 | 라디오 레이블·키보드 선택, 선택 수·저장 진행·완료 표시, 저장 실패 시 선택 유지 | C1, US-03·US-04 | 핵심 화면 여정 확인 |
| 재현·검증 | 선택 스택의 의존성 고정과 실행 안내, 소수의 스모크 테스트 | 전체, 테스트 범위 | fixture 결과와 실제 GitHub 확인 구분 |

호스트·리다이렉트 검증 방식, 안전한 렌더러 설정, 트랜잭션 구현과 로컬 요청 경계는 NFR Design에서 구체화한다. 정확한 파일 배치·HTTP 경로·DB 파일 위치·SQL·실행 명령은 Code Generation 계획에서 확정한다.

## 기술 스택 비교와 준비 조건

권장안은 1.5일 범위와 한 화면의 상호작용을 기준으로 선택한 설계 판단이다. 기존 환경에 설치되어 있다는 이유로 특정 버전을 최종 고정하지 않는다.

| 선택 | 구성 | 이번 MVP에 대한 판단 | 준비 조건 |
| --- | --- | --- | --- |
| A | Python + Flask, HTML/CSS + 브라우저 JavaScript, SQLite | UI 빌드 도구 없이 폼·문서·대기열을 구성하고 서버 책임을 Python 모듈로 나눈다. 권장 | 프로젝트 가상환경과 호환 런타임·패키지 버전 확인 |
| B | TypeScript + React/Vite, Node.js + Express, SQLite | UI 상태를 React로 구성하고 서버에도 TypeScript를 사용한다. UI 빌드 설정이 추가된다 | 호환 Node와 패키지 준비, 빌드된 UI를 Express가 제공하여 최종 실행 프로세스는 하나로 유지 |

A에서도 화면 설계의 논리 컴포넌트·서비스 계약과 모든 사용자 기능을 유지한다. B에서도 별도 UI 서버를 상시 실행하는 배포 구조를 만들지 않는다. 두 안 모두 SQLite 파일, 로컬 단일 앱, 스모크 범위를 유지한다.

2026-09-08 읽기 전용 환경 확인 결과는 Python 3.9.7, SQLite 3.36.0, Node 20.17.0, npm 10.8.2다. 이 값들은 현 PATH의 관찰값이며 최종 지원 버전이 아니다. 현재 Vite 안내의 Node 요구사항은 20.19+ 또는 22.12+이므로 B 선택 시 현재 PATH의 Node를 그대로 사용할 수 없다. [Vite 공식 시작 안내](https://vite.dev/guide/)

Flask는 가상환경을 통한 프로젝트 의존성 분리를 안내한다. A 선택 시 지원 런타임과 전체 패키지의 호환성을 확인해 결정 문서에 고정할 기준을 명시한다. [Flask 설치 안내](https://flask.palletsprojects.com/en/stable/installation/)

A의 SQLite 접근 후보는 Python의 `sqlite3`다. 로컬 파일 연결과 명시적 커밋을 제공하며 별도 DB 서버가 필요 없다. [Python sqlite3 문서](https://docs.python.org/3/library/sqlite3.html)

A의 Markdown 후보는 `markdown-it-py`다. 기본 설정은 원시 HTML을 허용하므로 표시 경로에 안전한 설정을 명시해야 한다. 공식 문서는 HTML 비활성화 또는 허용 시 별도 정화를 안내한다. 질문 추출의 블록 인식과 표시 렌더링은 서로 다른 목적이므로 원문·바이트 위치 보존 계약을 따로 지킨다. [markdown-it-py 보안 안내](https://markdown-it-py.readthedocs.io/en/latest/security.html)

B는 빌드된 UI를 서버에서 정적 파일로 제공할 수 있다. 구체적인 SQLite·Markdown 라이브러리는 선택 후 호환성을 확인한다. [Express 정적 파일 안내](https://expressjs.com/en/starter/static-files/)

## Question 1

이번 MVP의 기술 스택을 어떤 구성으로 진행할까요? 언어·프레임워크가 기존 산출물에서 미정으로 남아 있어 유지보수 선호를 확인합니다.

A) Python + Flask, HTML/CSS + 브라우저 JavaScript, SQLite (권장) — UI 빌드 도구 없이 단일 앱으로 구성

B) TypeScript + React/Vite, Node.js + Express, SQLite — UI와 서버를 TypeScript로 구현하며 UI 빌드와 호환 Node 환경 준비 포함

X) Other (please describe after [Answer]: tag below) — 원하는 언어·프레임워크 또는 환경 제약을 기재

[Answer]: Tyspescript Fastify + vue.js 조합으로 진행해줘.

2026-09-08 답변 검증: 위 원문을 사용자 지정 스택으로 채택한다. `Tyspescript`는 문맥상 TypeScript의 오타이며 Fastify + Vue.js 선호가 명확하다. 선택 문자 X가 없지만 구체적인 자유서술이므로 재질문 없이 처리한다. SQLite·로컬 단일 앱·스모크 범위와 모순이 없다. 사용자 원문은 그대로 보존한다. 이 선택은 NFR 산출물의 최종 승인과 구분한다.

## 확장 규칙 준수와 검증

| 확장 | Enabled | 규칙별 결과 | 근거 |
| --- | --- | --- | --- |
| Security Baseline | No | 전체 규칙 N/A | 비활성 결정 유지, 전체 규칙 미로드·미적용. 기존 최소 보안은 별도 유지 |
| Property-Based Testing | No | 전체 규칙 N/A | 스모크 테스트만 수행 |
| Resiliency Baseline | No | 전체 규칙 N/A | 성능·확장성·고가용성·복원력 설계 제외 |

활성 확장 차단 항목은 없다. 계획과 산출물 2개의 Markdown 파싱·표 열 수·상대 링크를 검증했다. 사용자 자유서술 답변은 명확한 스택 지정으로 처리하고 원문을 보존했다. NFR 9개·스모크 묶음 4개·구성 요소 7개와 요구사항·스토리 연결을 확인했다. 검토 파일은 Construction의 두 선택지와 빈 답변 태그 하나를 사용한다. 신규 도식은 없어 Mermaid·ASCII 검증은 N/A다. 의존성 설치·애플리케이션 빌드·테스트는 수행하지 않았다. 11번과 단계 완료는 산출물 승인 후 기록한다.
