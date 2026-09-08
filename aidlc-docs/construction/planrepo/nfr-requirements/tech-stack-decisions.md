	# PlanRepo 기술 스택 결정

## 결정과 사용자 근거

[NFR 계획 Q1](../../plans/planrepo-nfr-requirements-plan.md)의 사용자 원문은 `Tyspescript Fastify + vue.js 조합으로 진행해줘.`다. TypeScript + Fastify + Vue.js라는 구체적인 지정으로 해석하고 원문을 보존했다. 기존 Python/Flask 권장안과 React/Express 대안은 채택하지 않는다. [최소 NFR](nfr-requirements.md) 및 [단위 정의](../../../inception/application-design/unit-of-work.md)의 SQLite·로컬 단일 앱·1.5일·스모크 범위를 유지한다.

아래 라이브러리 선택은 지정 스택을 구체화하는 설계 결정이며 2026-09-08 사용자 채팅 `진행해줘.`로 NFR 산출물이 승인됐다. 정확한 패치 버전과 잠금 파일은 Code Generation에서 실제 설치·타입 검사·빌드·스모크 결과로 확정한다. 현 단계에서 설치된 조합이라고 주장하지 않는다.

## 구성과 선택 근거

| 영역 | 선택·버전 기준 | 판단과 대안 | NFR |
| --- | --- | --- | --- |
| 런타임 | Node.js 24 LTS, 24.12.0 이상인 24.x에서 패치 고정. npm은 선택 Node와 호환되는 버전으로 고정 | Vue 공식 시작 안내의 하한과 Fastify·Vite 요구를 함께 충족하는 개발 기준. Node 22도 가능하지만 지원 환경을 하나로 한정 | NFR-01, NFR-09 |
| 언어·서버 | TypeScript, Fastify 5.x, ESM. 서버는 tsc로 JavaScript 생성 | 사용자 선택. HTTP 어댑터는 얇게 두고 C2 서비스에 도메인 검증을 유지. React/Express 또는 Python 대안 재선택 불필요 | NFR-02, NFR-07, NFR-09 |
| UI·빌드 | Vue 3, Composition API와 TypeScript SFC, Vite 및 호환 @vitejs/plugin-vue, vue-tsc | 한 화면의 상태를 ReviewPage가 소유. Vue Router·Pinia·SSR·Nuxt 없이 승인된 props·이벤트 구조 사용 | NFR-01, NFR-08, NFR-09 |
| 정적 제공 | Fastify 5와 호환되는 @fastify/static 8.x 이상에서 버전 고정 | 빌드된 UI만 제공. 최종 사용 흐름에서 Vite 개발 서버를 상시 실행하지 않음 | NFR-01, NFR-02 |
| SQLite | better-sqlite3와 필요한 TypeScript 타입, 파일 기반 SQLite | 기존 두 논리 테이블과 동기 트랜잭션 API에 맞는 선택. ORM·별도 DB 서버 없이 파라미터 바인딩 SQL 사용 | NFR-04, NFR-05 |
| Markdown | markdown-it, 필요한 TypeScript 타입. 파싱용 블록 분석과 표시용 렌더러를 분리 설정 | 동일 라이브러리의 블록 문맥·줄 매핑을 활용하고 AI-DLC 문법·바이트 위치는 C4가 직접 관리. 정규식만으로 문서 전체를 파싱하거나 HTML에서 원문을 복원하지 않음 | NFR-03, NFR-06 |
| 외부 HTTP | Node 내장 fetch와 URL을 감싼 C3 전용 읽기 어댑터 | 공개 GitHub 읽기만 필요하므로 별도 GitHub SDK·인증 모듈 없이 시작. 고정된 GitHub API 경로 구성과 리다이렉트 정책은 NFR Design에서 구체화 | NFR-02, NFR-07 |
| 식별·바이트 | Node crypto, Buffer, 명시적인 비교 튜플 직렬화 | 서버가 질문 키·조회 핸들과 바이트 오프셋을 관리. TypeScript 문자열 인덱스를 UTF-8 바이트 오프셋으로 취급하지 않음 | NFR-06 |
| 자동 스모크 | node:test + node:assert/strict + fastify.inject, 실제 임시 SQLite 파일과 소수 fixture | 핵심 서비스·HTTP 흐름을 한정 검증. 별도 테스트 프레임워크·속성 기반 테스트는 추가하지 않음. 화면 조작과 실제 GitHub 확인은 짧은 브라우저 스모크로 보완 | NFR-01~NFR-09 |

동기 SQLite는 단일 사용자 MVP의 작은 일괄 확정에 맞춘 설계 판단이다. 처리량 또는 동시성 성능을 보장하는 근거로 사용하지 않는다. DB 네이티브 모듈의 설치 호환성은 코드 생성 시 확인할 준비 조건이다.

## 공식 근거와 환경 관찰

2026-09-08 PATH에서 읽기 전용으로 확인한 환경은 Node 20.17.0, npm 10.8.2다. 현재 Node는 Vite 문서의 최소 20.19+/22.12+ 조건보다 낮다. Vite 문서는 템플릿이 더 높은 버전을 요구할 수 있다고 안내한다. [Vite 시작 안내](https://vite.dev/guide/)

Vue 공식 시작 안내는 Node `^22.18.0` 또는 `>=24.12.0`을 제시하고 Vite 기반 SFC 구성을 설명한다. 따라서 이 프로젝트의 기준은 Node 24.12.0 이상인 24 LTS로 결정한다. 이는 해당 공식 조건을 반영한 프로젝트 선택이다. [Vue 시작 안내](https://vuejs.org/guide/quick-start.html)

Node 공식 릴리스 표에서 24는 LTS이고 20은 EOL이다. 현재 PATH의 20.17.0에 맞춰 새 프로젝트 스택을 낮추지 않는다. [Node 릴리스 현황](https://nodejs.org/en/about/previous-releases)

Fastify 5는 Node 20 이상을 요구하고 기본 검증에서 body·params·querystring에 완전한 JSON Schema를 사용한다. TypeScript 타입만으로 서버 입력 검증을 대신하지 않는다. [Fastify 5 안내](https://fastify.dev/docs/latest/Guides/Migration-Guide-V5/)

@fastify/static의 호환표는 8.x 이상을 Fastify 5.x에 연결하고, 빌드된 SPA의 정적 제공 예시를 제시한다. [정적 파일 플러그인](https://github.com/fastify/fastify-static)

Vue 문서는 Vite의 TypeScript 변환과 타입 검사를 구분하며 vue-tsc를 안내한다. 서버 tsc와 UI vue-tsc를 빌드 검증에 포함한다. [Vue TypeScript 안내](https://vuejs.org/guide/typescript/overview.html)

better-sqlite3는 파일 경로로 DB를 열고 transaction 함수가 반환하면 커밋, 예외가 나면 롤백한다. 트랜잭션 콜백에는 비동기 네트워크 작업을 넣지 않는다. 네이티브 바인딩을 사용하므로 선택 Node·OS·아키텍처 조합에서 설치와 DB 열기를 확인한다. [better-sqlite3 API](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md)

markdown-it의 API는 파싱과 렌더링 설정을 제공한다. 블록 분석 결과는 원본 바이트의 대체물이 아니므로 줄 매핑과 별도 바이트 표를 연결한다. [markdown-it API](https://markdown-it.github.io/markdown-it/index.html)

Fastify는 포트를 열지 않는 inject와 node:test 사용을 안내한다. 이를 자동 핵심 스모크에 사용하되 실제 브라우저·네트워크 검증 결과와 구분한다. [Fastify 테스트 안내](https://fastify.dev/docs/latest/Guides/Testing/)

## C1~C7 구현 책임

| 구성 요소 | 스택 적용 | 경계 |
| --- | --- | --- |
| C1 ReviewUI | Vue SFC·TypeScript·CSS. ReviewPage가 pendingSelections와 요청 순서를 소유 | C2의 HTTP API만 호출. 일반 텍스트는 Vue 텍스트 바인딩. 본문 HTML 삽입은 C5 SafeHtml 전용 |
| C2 PlanRepoService | TypeScript 서비스와 Fastify 라우트 어댑터 | 공통 타입, 서버 입력·컨텍스트·후보 검증, 원문과 저장 결정 병합. C3~C7 같은 프로세스 호출 |
| C3 GitHubSource | fetch·URL 기반 TypeScript 모듈 | 공개 GitHub 읽기만. 검증된 경로와 기본 브랜치의 한 조회 버전으로 SourceBundle 생성 |
| C4 QuestionParser | markdown-it 블록 분석 + TypeScript AI-DLC 파서 | 분석용 인스턴스는 HTML 블록·주석을 식별할 수 있도록 설정하지만 HTML을 UI에 출력하지 않음. 원문 Buffer·줄별 바이트 표와 question identity 보존 |
| C5 MarkdownRenderer | 별도 markdown-it 렌더 인스턴스 | raw HTML 비활성화, 위험 URL 허용 방지, 외부 플러그인·커스텀 raw HTML 생성 없음. 정확한 설정과 링크 정책은 NFR Design에서 정의 |
| C6 DecisionStore | better-sqlite3, 파라미터 바인딩 SQL, 동기 트랜잭션 | recent_connection·decisions 파일 저장. 같은 문자 재요청의 기존 행·시각 유지, 전체 롤백 |
| C7 MarkdownExporter | TypeScript·Buffer 기반 삽입 | C2에서 받은 호환 확정 답변만 역순 바이트 삽입. HTML·브라우저 미확정 선택·네트워크 사용 없음 |

C4의 분석 설정과 C5의 안전 표시 설정을 분리하여 HTML 예시를 질문으로 오인하지 않으면서 표시 안전성을 유지한다. markdown-it 기본 동작만으로 모든 승인 파싱 정책이 충족된다고 가정하지 않는다. BR-03·BR-04 및 바이트 보존 사례로 확인한다.

## 준비·고정·단일 명령 전략

1. Code Generation에서 기존 사용 가능한 Node 24 환경을 먼저 확인한다. 없으면 프로젝트에 사용할 런타임을 준비한다. 현재 전역 Node 변경이나 의존성 설치는 수행하지 않았다.
2. Node 24.12.0 이상인 24.x 패치와 npm 버전을 실행 안내·런타임 설정에 기록한다. 각 패키지의 engines와 peerDependencies를 대조하고 호환 버전을 정확히 고정한다. 자동 실행 중 latest를 따라가지 않는다.
3. 루트 package.json과 package-lock.json으로 UI·서버 의존성을 함께 관리한다. 최초 고정 후 재설치는 npm ci를 기준으로 한다. 소스는 루트 src/, 스모크는 tests/ 책임 아래 배치하며 정확한 경로는 코드 생성 계획에 명시한다.
4. 개발 의존성은 TypeScript·Vite·Vue 플러그인·vue-tsc·필요 타입 패키지로 제한한다. 서버는 ESM JavaScript로 컴파일하고 better-sqlite3 네이티브 바인딩을 서버 번들 안에 합치지 않는다.
5. 시작 진입점은 준비 후 한 명령으로 UI·서버 빌드와 Fastify 실행을 순서대로 수행하도록 구성한다. 준비 설치와 시작을 안내에서 구분한다. 실행 중 지속되는 앱 프로세스는 Fastify 하나이며 UI는 같은 출처에서 제공한다.
6. better-sqlite3 설치·DB 열기·트랜잭션 확인, 서버·UI 타입 검사, 빌드, 핵심 스모크 결과와 사용 버전을 기록한다. 네이티브 사전 빌드가 없으면 로컬 빌드 도구가 필요할 수 있으며 이 준비 조건을 실행 안내에 기록한다. DB 파일은 빌드 산출물 청소 대상 밖에 둔다.

정확한 설치 패치 버전이 아직 없는 것은 스택 선호 미결정이 아니라 구현 환경 검증 전이라는 뜻이다. Node·패키지 설치 가능성을 검증하지 않은 상태에서 호환 테스트 통과를 주장하지 않는다.

## 단계별 후속 결정

| 단계 | 결정할 내용 | 고정된 기준 |
| --- | --- | --- |
| NFR Design | GitHub·리다이렉트·폴더 검증, 로컬 요청 경계, 렌더러·분석기 설정, 오류 변환, 트랜잭션·컨텍스트 적용 순서 | NFR-01~NFR-09, 기존 BR-01~BR-12 |
| Code Generation 계획 | 파일 배치·타입·HTTP 경로·JSON Schema·SQL·DB 위치·비교 튜플와 digest 명세·스크립트 | C1~C7 단일 단위, 기존 기능 정책 |
| Code Generation 및 Build and Test | 호환 패치·잠금 파일·설치 결과, 타입 검사·빌드와 SM-01~SM-04 결과 | 단일 명령 시작, 핵심 경로 스모크 한정 |

질문 내용 일치 재사용과 원문 답변 우선 정책, 원자적 확정·원문 보존은 재결정하지 않는다. 인증·원격 쓰기·다중 사용자·SSR·배포·성능·확장성·고가용성·복원력은 범위 밖이다.

## 확장 준수

| 확장 | Enabled | 규칙별 결과 | 이유 |
| --- | --- | --- | --- |
| Security Baseline | No | 전체 규칙 N/A | 비활성, 전체 규칙 미로드·미적용. 승인된 최소 보안만 적용 |
| Property-Based Testing | No | 전체 규칙 N/A | 스모크 도구만 선택 |
| Resiliency Baseline | No | 전체 규칙 N/A | 복원력·성능·확장성·고가용성 설계 제외 |

활성 확장 차단 항목은 없다. 현재 산출물은 스택·준비 조건의 문서 결정이며 환경 설치·애플리케이션 빌드·테스트 결과가 아니다.
