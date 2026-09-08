# PlanRepo NFR Design 계획

## 상태와 기준

2026-09-08 사용자 `진행해줘.`로 NFR Requirements 승인 완료. TypeScript + Fastify + Vue.js, Node 24 LTS, SQLite, markdown-it 선택을 유지한다. 깊이는 최소이며 단일 앱·1.5일·스모크 한정이다.

기준: [NFR 요구사항](../planrepo/nfr-requirements/nfr-requirements.md), [스택](../planrepo/nfr-requirements/tech-stack-decisions.md), [기능 알고리즘](../planrepo/functional-design/business-logic-model.md), [업무 규칙](../planrepo/functional-design/business-rules.md), [저장 모델](../planrepo/functional-design/domain-entities.md), [화면](../planrepo/functional-design/frontend-components.md), [단위 의존성](../../inception/application-design/unit-of-work-dependency.md).

## 실행 체크리스트

- [x] 1. NFR Requirements 명시적 채팅 승인을 기록하고 선행 계획·단계·산출물 상태를 갱신한다.
- [x] 2. NFR 9개, 기능 설계, C1~C7 계약과 스모크 범위를 분석한다.
- [x] 3. 질문 범주 5개를 평가하고 승인된 결정으로 해소된 항목과 구현 판단을 기록한다.
- [x] 4. 최소 설계 패턴·논리 구성 요소 계획을 작성하고 Markdown·표·링크를 검증한다.
- [x] 5. nfr-design-patterns.md를 작성한다: 로컬 입력 경계, GitHub 읽기, 안전 표시·분석 분리, 원자 저장·컨텍스트, 바이트 보존, 오류·화면, 실행·스모크.
- [x] 6. logical-components.md를 작성한다: C1~C7의 책임·수명·데이터 경계·직접 의존성·시작과 종료 및 NFR 매핑.
- [x] 7. 두 산출물의 요구사항·규칙·스모크 추적성, 설정 일관성, Markdown·표·링크와 제외 범위를 검증한다.
- [x] 8. 검토 파일과 상태·감사 기록을 갱신하고 표준 두 선택지로 산출물 검토를 요청한다.
- [x] 9. NFR Design 명시적 승인을 기록하고 단계 완료 후 Code Generation 계획으로 이동한다.

## 질문 범주 평가

| 범주 | 적용 판단과 근거 | 질문 처리 |
| --- | --- | --- |
| Resilience Patterns | 독립 복원력 설계 N/A. NFR-04~NFR-07과 BR-02·BR-08·BR-09의 롤백·오류·같은 답변 재요청만 반영 | 승인된 제외와 기능 정책이 명확하므로 추가 질문 없음 |
| Scalability Patterns | N/A. 단일 사용자·활성 저장소 하나, 확장 설계 제외 | 성장률·용량·분산 구성 재질문 없음 |
| Performance Patterns | N/A. 지연 목표·부하·캐시 최적화 제외. 외부 요청 종료 시간은 오류 처리를 위한 구현 기본값 | 새로운 SLA 질문 없음 |
| Security Patterns | 적용. NFR-02·NFR-03·NFR-07의 서버 검증·GitHub 호스트 제한·HTML 비실행·내부 오류 비노출 | loopback·같은 출처 요청, 고정 GitHub API 출처와 리다이렉트 거부, 별도 분석·표시 렌더러로 구현. 인증·규정 준수 선택 없음 |
| Logical Components | 적용. 기존 C1~C7과 SQLite 파일·메모리 컨텍스트로 충족. 새 큐·캐시·외부 서비스 없음 | 상위 단위·책임이 승인되어 재분해 질문 없음 |

5개 범주 모두 평가했다. 사용자 선택이 필요한 미결정 제품 정책은 없다. 세부 패턴은 승인된 NFR을 구현하는 설계 판단이므로 불필요한 답변 태그를 만들지 않고 산출물을 작성한다. 다음 단계 규칙의 승인 대상은 완성된 설계 문서다.

## 생성·검증 범위

필수 산출물은 `aidlc-docs/construction/planrepo/nfr-design/`의 nfr-design-patterns.md와 logical-components.md다. 정확한 파일명·HTTP 경로·SQL·DB 위치·패치 버전·실행 스크립트는 Code Generation 계획에 넘긴다. 브라우저 UI에서 DB·GitHub 직접 접근을 허용하지 않으며 C4·C7의 순수 원문 처리 경계를 유지한다.

SM-01~SM-04에 설계별 관찰 결과를 연결한다. 현재 문서 단계에서는 의존성 설치나 동작 테스트를 수행하지 않는다. 신규 도식은 없으며 Mermaid·ASCII 검증은 N/A다. 표와 연결된 설명으로 구조를 표현한다.

## 확장 준수

| 확장 | Enabled | 규칙별 결과 | 이유 |
| --- | --- | --- | --- |
| Security Baseline | No | 전체 규칙 N/A | 비활성 유지, 승인된 최소 보안만 적용 |
| Property-Based Testing | No | 전체 규칙 N/A | 핵심 경로 스모크 한정 |
| Resiliency Baseline | No | 전체 규칙 N/A | 복원력·성능·확장성·고가용성 제외 |

활성 확장 차단 항목은 없다. 전체 확장 규칙 파일은 로드·적용하지 않는다.

## 산출물 검증 결과

필수 설계 문서 2개 작성·검증 완료. NFR 9개와 패턴 8개, C1~C7 책임 및 SM-01~SM-04 연결, 선행 기능 규칙·제외 범위 일관성, Markdown 파싱·표 열 수·상대 링크를 확인했다. 신규 도식·애플리케이션 실행 테스트는 없다. [산출물 검토](planrepo-nfr-design-review-questions.md) 승인 완료: 2026-09-08 사용자 채팅 `진행해줘.`. 1~9번 모두 완료다.
