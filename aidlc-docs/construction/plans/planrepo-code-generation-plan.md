# PlanRepo Code Generation 계획

## 로컬 저장소 구현 변경 계획 (2026-09-08, 현재 요청의 기준)

이 절은 로컬 Git 작업 트리 지원에 대한 Code Generation의 단일 실행 기준이다. 사용자의 명시적 지시로 Application Design, Units Generation, Functional Design, NFR Requirements 및 NFR Design은 생략했다. 구현은 승인된 요구사항·사용자 스토리와 이 계획의 경로·계약만 따른다. 기존 GitHub 전용 코드 생성 단계의 완료 상태는 보존하되, 새 로컬 기능은 아래 계획을 승인받은 뒤에만 변경한다.

### Part 1 계획 준비

- [x] Step L1. 작업공간, 단일 `planrepo` 단위, FR-1부터 FR-6, US-01부터 US-05, 기존 GitHub 구현과 사용자 단계 생략 지시를 확인한다.
- [x] Step L2. 기존 파일을 수정할 정확한 경로, 공개 계약, SQLite 버전 1 호환 마이그레이션, 로컬 Git 읽기 경계와 스모크 범위를 작성한다.
- [x] Step L3. 계획의 Markdown·경로·표·링크와 로컬 경로/명령 제약을 검증하고 승인 요청을 준비한다.
- [x] Step L4. 전체 변경 계획과 생성 순서의 명시적 승인을 기록한다. (2026-09-08 사용자 `구현 진행해줘.`)

### 실행 체크리스트

- [x] Step L5. `src/shared/types.ts`, `src/server/http/schemas.ts`, `src/client/api.ts`를 수정한다. 연결 입력을 `sourceType`이 구분되는 GitHub 또는 로컬 소스로 확장하고, 소스 위치와 문서 폴더를 검증 가능한 DTO로 만든다. 기존 GitHub 최근 연결을 호환해 읽는다. (US-01, US-04)
- [x] Step L6. `src/server/app-config.ts`, `src/server/errors.ts`, `src/server/domain/identity.ts`를 수정한다. 정규화된 실제 경로가 앱 작업공간 안에 있는지 판정하고, 로컬 저장소 식별자와 오류 코드를 추가한다. 경로 검증은 심볼릭 링크 해석 후에도 경계를 넘지 않게 한다. (US-01)
- [x] Step L7. `src/server/local-git-source.ts`를 생성하고 `src/server/github-source.ts`, `src/server/app.ts`, `src/server/planrepo-service.ts`를 수정한다. `git rev-parse`, `git ls-tree`, `git show`의 읽기 전용 호출로 작업 트리·`HEAD`·지정 폴더를 검증하고 Markdown `HEAD` blob을 로드한다. GitHub와 로컬 소스를 공통 SourceBundle로 조정하며 Git write 명령은 호출하지 않는다. (US-01, US-02, US-05)
- [x] Step L8. `src/server/storage/schema.ts`와 `src/server/storage/decision-store.ts`를 수정한다. 데이터 삭제 없이 스키마 버전을 올리고, 최근 연결의 소스 유형·위치와 결정 키를 원격/로컬별로 보존한다. 버전 1의 GitHub 결정과 최근 연결은 GitHub 소스로 읽을 수 있게 마이그레이션한다. (US-04; repository key prefixes separate sources without schema changes)
- [x] Step L9. `src/client/components/ConnectionForm.vue`, `src/client/App.vue`, `src/client/styles.css`를 수정한다. 소스 유형 선택, GitHub URL 또는 로컬 절대 경로 입력, 문서 폴더와 오류 상태를 제공하며 모든 새 상호작용 요소에 안정적인 `data-testid`를 둔다. (US-01, US-02, US-04)
- [x] Step L10. `tests/core.smoke.test.mjs`와 필요한 fixture를 수정한다. 작업공간 안의 실제 Git 작업 트리에서 `HEAD` 문서를 로드하고, 미커밋 변경 제외와 작업공간 밖 경로 거부를 검증한다. 기존 GitHub 스모크는 회귀로 유지한다. (US-01, US-02, US-04, US-05)
- [x] Step L11. `aidlc-docs/construction/planrepo/code/README.md`, `api.md`, `implementation-summary.md`를 수정한다. 로컬 입력, 작업공간 경계, Git `HEAD` 읽기, 결정 분리, 실행·스모크 증거와 미검증 항목을 기록한다. (FR-1부터 FR-6)
- [x] Step L12. 타입 검사, 서버·클라이언트 빌드, 핵심 스모크 및 로컬 HTTP 확인을 실행한다. 실패는 계획 범위에서 수정한 뒤 증거를 기록한다. (US-01부터 US-05; 4 smoke tests passed)
- [x] Step L13. 생성 파일, 사용자 스토리 인수 조건, 계획 체크박스, 상태와 감사 기록을 갱신하고 Code Generation 산출물 검토를 요청한다.

### 구현 계약

- 애플리케이션 코드는 기존 경로에서만 수정하거나 `src/server/local-git-source.ts` 하나를 추가한다. 문서 산출물은 `aidlc-docs/construction/planrepo/code/`에만 둔다.
- 로컬 저장소 입력은 절대 경로의 저장소 루트와 상대 문서 폴더다. 실경로는 `AppConfig.rootDirectory` 또는 그 하위여야 하며, Git 작업 트리와 `HEAD`가 필요하다.
- 로컬 문서는 현재 `HEAD`의 tree와 blob에서만 읽는다. 작업 트리·index·원격은 변경하지 않고, `git add`, `commit`, `checkout`, `reset`, `push`, `pull`, `fetch`, `clone`을 호출하지 않는다.
- GitHub와 로컬 소스는 서로 다른 repository key를 사용한다. 기존 저장 결정은 보존하며 version-1 SQLite 데이터는 GitHub 소스로 계속 재사용한다.
- 새 또는 변경된 UI 상호작용에는 `connection-form-source-type-select`, `connection-form-local-path-input` 등 목적 기반 `data-testid`를 사용한다.
- 자동 검증은 기존 핵심 스모크와 새 로컬 Git 경로로 한정한다. 성능·부하·속성 기반·배포 테스트와 새 의존성은 추가하지 않는다.

### 확장 규칙 준수

| 확장 | Enabled | 결과 |
| --- | --- | --- |
| Security Baseline | No | N/A. 승인된 작업공간 실경로 경계와 읽기 전용 Git 제약을 구현 계약으로 유지한다. |
| Property-Based Testing | No | N/A. 핵심 경로 스모크만 작성·실행한다. |
| Resiliency Baseline | No | N/A. 복원력·성능·고가용성 설계는 추가하지 않는다. |


## 상태·단위·범위

Part 1 계획 작성·검증과 전체 계획·생성 순서 승인이 완료됐다. 사용자는 2026-09-08 채팅 `진행해줘.`로 Code Generation 전체 계획을 승인했다. NFR Design도 같은 날 사용자 채팅 `진행해줘.`로 승인됐다. 이 문서는 planrepo Code Generation의 단일 실행 기준이다. 각 단계를 마친 즉시 체크하며, 후속 구현에서 변경이 필요하면 이 계획에 근거와 실제 경로를 먼저 반영한다.

- 작업공간: `/Users/dgyim/works/planrepo-aidlc-codex`, greenfield 단일 단위 planrepo.
- 사용자·범위: P-01 로컬 문서 검토자, FR-1~FR-6, US-01~US-05 전체.
- 의존성: 다른 구현 단위 없음. C1 → C2 → C3~C7 직접 호출, C3만 공개 GitHub GET, C6만 SQLite 접근.
- 스택: TypeScript, Fastify 5, Vue 3/Vite, Node 24 LTS의 24.12.0 이상 패치, better-sqlite3, markdown-it.
- 상태: C1 임시 선택, C2 메모리 원문·컨텍스트, C6 최근 성공 연결·확정 결정 영속화.
- 제약: 전체 MVP 1.5일, 앱 프로세스 하나, 핵심 스모크만. 배포·인증·원격 쓰기·다중 사용자·성능·확장성·고가용성·복원력·속성 기반 테스트 제외.

근거: [요구사항](../../inception/requirements/requirements.md), [스토리](../../inception/user-stories/stories.md), [단위·스토리 매핑](../../inception/application-design/unit-of-work-story-map.md), [서비스 계약](../../inception/application-design/component-methods.md), [기능 알고리즘](../planrepo/functional-design/business-logic-model.md), [저장 모델](../planrepo/functional-design/domain-entities.md), [UI](../planrepo/functional-design/frontend-components.md), [NFR](../planrepo/nfr-requirements/nfr-requirements.md), [스택 결정](../planrepo/nfr-requirements/tech-stack-decisions.md), [설계 패턴](../planrepo/nfr-design/nfr-design-patterns.md), [논리 구성 요소](../planrepo/nfr-design/logical-components.md).

## 실행 체크리스트

- [x] Step 1. NFR Design 승인 원문을 기록하고 상세 계획·단계·상태를 완료 처리한다.
- [x] Step 2. 단위·스토리·기능·NFR 계약과 workspace를 검토한다. 기존 앱 코드 없음, C1~C7 단일 단위와 실행 환경 준비 필요를 확인한다.
- [x] Step 3. 아래 실제 경로·HTTP·DB·키·실행·검증 계약과 생성 순서를 작성한다.
- [x] Step 4. 계획의 추적성·Markdown·표·링크·SQL 구문을 검증하고 상태·감사 기록·전체 계획 승인 요청을 준비한다.
- [x] Step 5. 전체 계획·생성 순서에 대한 명시적 승인을 기록하고 Code Generation Part 1을 완료한다. (2026-09-08 채팅 `진행해줘.`)
- [x] Step 6. 프로젝트 골격과 런타임을 준비한다. 호환 Node·npm·직접 패키지를 확인·고정하고 루트 설정, .gitignore, scripts/start.mjs·check-runtime.mjs, Vite·TypeScript 설정을 생성한다. 의존성 설치 후 잠금 파일과 실제 버전을 기록한다. (전체 스토리, NFR-01·NFR-09) Node v24.12.0·npm 11.6.2에서 완료.
- [x] Step 7. src/shared/types.ts, src/server/errors.ts, app-config.ts, domain/identity.ts를 생성한다. 도메인 타입·오류·서버 설정·키 직렬화·바이트 다이제스트를 구현한다. (US-01~US-05) 서버 TypeScript 빌드 통과.
- [x] Step 8. src/server/storage/schema.ts와 decision-store.ts를 생성한다. 버전 1 비파괴 초기화, 최근 연결 조회·저장, 결정 조회·원자 확정·같은 문자 재요청을 구현한다. (US-04·US-05, NFR-04·NFR-05) 서버 TypeScript 빌드 통과.
- [x] Step 9. src/server/github-source.ts를 생성한다. URL·폴더 검증, 고정 API GET·브랜치/커밋 고정, tree 탐색·blob 읽기, 3xx·잘린 응답·접근/요청 한도 오류를 처리한다. (US-01·US-02) 서버 TypeScript 빌드 통과.
- [x] Step 10. src/server/markdown/question-parser.ts를 생성한다. 원문 줄·UTF-8 바이트 표, 코드·중첩·HTML 문맥 제외, AI-DLC 문법·비교 정보·중복 경고를 구현한다. (US-03·US-04·US-05) 서버 TypeScript 빌드 통과.
- [x] Step 11. src/server/markdown/renderer.ts와 exporter.ts를 생성한다. 표시 전용 안전 설정·상대 URL 처리와 검증된 확정 답변의 역순 바이트 삽입을 구현한다. (US-02·US-05) 서버 TypeScript 빌드 통과.
- [x] Step 12. src/server/planrepo-service.ts를 생성한다. 완전한 연결·저장 결정 병합, 연결/확정 순서, 활성 컨텍스트 검증, 원문 우선·유일한 내용 일치 재사용, 조회·내보내기를 연결한다. (전체 스토리) 서버 TypeScript 빌드 통과.
- [x] Step 13. src/server/http/schemas.ts, routes.ts, app.ts, main.ts를 생성한다. API·Host/Origin·오류 변환·정적 제공과 graceful shutdown을 연결한다. app 생성과 listen을 분리한다. (전체 스토리)
- [x] Step 14. src/client의 Vue 파일을 생성한다. 연결·목록·본문·대기열·라디오 선택·일괄 확정·다운로드·상태 표시와 안정적인 data-testid를 구현한다. 기존 화면 상태·키보드·응답 순서 계약을 적용한다. (전체 스토리)
- [x] Step 15. tests/core.smoke.test.mjs, github-fixture.mjs와 fixtures 문서를 생성한다. 실제 임시 SQLite와 fixture HTTP로 SM-02~SM-04의 성공·주요 실패를 묶고 SM-01 브라우저·실제 공개 GitHub 확인 절차를 정리한다. 계층별 광범위 단위 테스트는 승인된 스모크 한정에 따라 N/A다. (전체 스토리)
- [x] Step 16. aidlc-docs/construction/planrepo/code/의 실행 README, API 안내와 업무·API·저장·UI 구현 요약을 작성한다. 실제 파일·의존성·DB 위치·구현 범위·스모크 절차를 기록한다. 배포 산출물은 제외 승인에 따라 N/A다. (전체 스토리)
- [x] Step 17. 서버·UI 타입 검사와 빌드, 핵심 스모크, 로컬 시작과 브라우저 핵심 경로를 검증하고 실패를 수정한다. 실제 GitHub 확인을 별도 기록한다. 새 변경·실패 근거 없이 반복하지 않으며 Build and Test에서 결과를 재사용한다. (SM-01~SM-04)
- [x] Step 18. 생성 파일·설계 일치·스토리 인수 조건을 확인하고 구현 요약, 계획 체크박스, 상태·감사 기록을 갱신한다. 완료된 스토리 조건만 체크하고 Code Generation 표준 두 선택지로 코드 산출물 검토를 요청한다.
- [ ] Step 19. 코드 산출물 명시적 승인을 기록하고 Code Generation을 완료한 뒤 Build and Test로 이동한다.

Step 5 전에는 앱 코드를 생성하거나 의존성을 설치하지 않는다. Step 6~16은 구현 11단계이며 Step 17은 검증, Step 18~19는 산출물 정리와 승인이다. 스모크에서 외부 요인으로 확인 못 한 항목은 미검증으로 남긴다.

## Step 6 실행 결과

`.nvmrc`를 `24.12.0`으로 고정하고, Node v24.12.0과 npm 11.6.2에서 `npm install`을 수행해 `package-lock.json`을 생성했다. `npm run check:runtime`과 JavaScript 구문 검사를 통과했다. 루트에 `package.json`, `.gitignore`, TypeScript/Vite 설정, 런타임·시작 스크립트를 만들었다. 현재 lockfile의 직접 패키지 해석 결과는 다음과 같다.

| 패키지 | 고정된 실제 버전 |
| --- | --- |
| fastify | 5.12.3 |
| @fastify/static | 8.3.0 |
| better-sqlite3 | 12.11.1 |
| markdown-it | 14.3.1 |
| vue | 3.5.42 |
| typescript | 5.9.3 |
| vite | 7.3.6 |
| @vitejs/plugin-vue | 6.0.8 |
| vue-tsc | 3.3.11 |

`npm install`은 의존성 그래프에서 high severity 취약점 1건과 두 개의 사용 중단 경고를 보고했다. 코드 생성 Step 17에서 `npm audit` 결과, 실제 사용 경로와 수정 가능 범위를 검토한다. 승인된 최소 범위를 넘어 `npm audit fix --force`를 실행하지 않는다.

## 생성할 경로

아래 경로는 작업공간 루트 기준이다. 기존 파일이 생긴 경우 먼저 확인하여 그 파일을 수정하고 별도 _new 사본을 만들지 않는다. 계획에 명시한 책임 안에서 관련 파일을 생성한다.

| 경로 | 책임 |
| --- | --- |
| package.json, package-lock.json, .nvmrc, .gitignore | 단일 패키지·버전·스크립트·생성물/DB 제외 |
| tsconfig.json, tsconfig.server.json, tsconfig.client.json, vite.config.ts | 공통 strict, Node ESM 서버, Vue 타입 검사·빌드 |
| scripts/check-runtime.mjs, scripts/start.mjs | Node 범위 확인과 빌드 후 서버 시작·신호 전달 |
| src/shared/types.ts | API DTO와 순수 도메인 공통 타입, 프레임워크 의존 없음 |
| src/server/app-config.ts, errors.ts, domain/identity.ts | 경로·포트·오류·키·digest |
| src/server/storage/schema.ts, decision-store.ts | SQLite DDL·버전·C6 |
| src/server/github-source.ts | C3 |
| src/server/markdown/question-parser.ts, renderer.ts, exporter.ts | C4, C5, C7 |
| src/server/planrepo-service.ts | C2 도메인 서비스 |
| src/server/http/schemas.ts, routes.ts | C2 HTTP 어댑터 |
| src/server/app.ts, main.ts | 앱 조립·정적 제공·listen·종료 |
| src/client/index.html, main.ts, env.d.ts, api.ts, styles.css, App.vue | Vite 엔트리·타입·HTTP·전역 스타일·ReviewPage |
| src/client/components/ConnectionForm.vue, DocumentList.vue, DocumentViewer.vue | 연결·목록·안전 본문 |
| src/client/components/DecisionQueue.vue, DecisionQueueItem.vue, ConfirmBar.vue | 질문·라디오·일괄 확정 |
| src/client/components/ExportButton.vue, WarningPanel.vue, StatusMessage.vue | 다운로드·경고·상태 |
| tests/core.smoke.test.mjs, tests/github-fixture.mjs | Node 테스트와 주입용 GitHub fetch fixture |
| tests/fixtures/questions.md, tests/fixtures/changed-questions.md | 유효·잘못된 질문·충돌·문서 변경 사례. BOM/CRLF 변형은 테스트에서 Buffer로 생성 |
| aidlc-docs/construction/planrepo/code/README.md, api.md | 준비·실행·DB·스모크 안내와 API 계약 |
| aidlc-docs/construction/planrepo/code/business-logic-summary.md, api-layer-summary.md, repository-layer-summary.md, frontend-summary.md, implementation-summary.md | 계층별 구현·파일·검증 결과와 남은 제약 |

생성물: dist/server/, dist/shared/, dist/client/, node_modules/, .local/planrepo.sqlite 및 SQLite 동반 파일. .gitignore로 제외한다. 테스트 DB는 OS 임시 디렉터리에 생성하고 테스트 소유 파일만 정리한다. 모든 설명 문서는 aidlc-docs/ 아래에 둔다.

## 런타임·빌드·실행 계약

읽기 전용 환경 확인에서 PATH Node 20.17.0, nvm Node 16.13.1·20.17.0·22.8.0, Homebrew Node 24.7.0을 찾았다. 확인한 환경에는 승인된 하한인 Node 24.12.0 이상이 없다. Step 6에서 지원되는 24.x 패치를 준비하고 .nvmrc와 실행 안내에 정확한 버전을 기록한다. 전역 기본 Node를 바꾸는 것을 전제로 하지 않는다.

런타임 패키지: fastify, @fastify/static, vue, better-sqlite3, markdown-it. 개발 패키지: typescript, vite, @vitejs/plugin-vue, vue-tsc, @types/node, @types/better-sqlite3, @types/markdown-it. 선택 Node에서 engines·peerDependencies와 Fastify 플러그인 호환성을 확인해 정확한 버전으로 저장하고 package-lock.json을 생성한다. npm ci로 재설치 가능하게 한다. 패키지 설치나 네이티브 빌드 실패는 원인과 해결 결과를 기록한다.

| 명령·설정 | 구체적 동작 |
| --- | --- |
| npm ci | 승인 후 생성된 잠금 파일 기준 준비 설치 |
| npm run typecheck | tsc -p tsconfig.server.json --noEmit 및 vue-tsc -p tsconfig.client.json --noEmit |
| npm run build:server | tsc -p tsconfig.server.json; rootDir=src, outDir=dist. 서버·shared만 include |
| npm run build:client | vite build; root=src/client, outDir=dist/client의 절대 경로, UI 출력만 정리 |
| npm run build | typecheck, build:server, build:client 순서 |
| npm run test:smoke | build:server 후 node --test tests/core.smoke.test.mjs; compiled dist/server 모듈 import |
| npm start | scripts/start.mjs: Node 확인, npm run build, dist/server/main.js 실행. 서버 종료 신호 전달 |
| PLANREPO_PORT | 기본 3000, 유효 정수 포트만 허용. 호스트는 127.0.0.1 고정 |
| PLANREPO_DB_PATH | 기본 프로젝트 루트/.local/planrepo.sqlite. 명시값은 프로젝트 루트 기준 또는 절대 경로로 해석; 정적 UI 루트 내부는 거부 |

서버 TypeScript는 NodeNext ESM과 strict를 사용하고 상대 import에는 출력 .js 경로를 적는다. UI 타입 검사는 DOM·Vue SFC를 대상으로 별도 설정한다. Vite가 dist/server·dist/shared를 지우지 않게 한다. 시작 스크립트는 셸 문자열 조합 대신 인수 배열과 현재 Node 실행 경로로 하위 프로세스를 실행한다. 빌드가 끝난 후 지속되는 앱은 Fastify 하나다. 반복 개발을 위한 별도 dev 서버는 MVP 필수 명령이 아니다.

## HTTP 계약

성공은 표의 DTO를 직접 반환하고 실패는 JSON의 error 객체에 code·message·retryable을 담는다. 목록과 경고는 빈 배열을 허용한다. query의 불투명 키는 URLSearchParams로 한 번 인코딩한다. 모든 조회는 활성 SnapshotId를 검증한다.

| 메서드·경로 | 입력 | 성공 200 결과 |
| --- | --- | --- |
| GET /api/connection | 없음 | recentConnection: 저장된 ConnectionInput 또는 null |
| POST /api/connection | JSON repositoryUrl, folderPath (루트는 빈 문자열) | WorkspaceView |
| GET /api/workspace | query snapshotId | WorkspaceView |
| GET /api/document | query snapshotId, documentKey | DocumentView |
| POST /api/answers | JSON snapshotId, selections: questionKey·optionLetter 목록 | CommitResult |
| GET /api/export | query snapshotId, documentKey | text/markdown; charset=utf-8, attachment 파일명, 원문 Buffer |

WorkspaceView는 snapshotId·connection·documents·unresolvedQuestions·warnings를 포함한다. documents는 documentKey·relativePath·unresolvedCount·completedCount를 가진다. 질문 DTO는 questionKey·documentKey·documentPath·number·prompt·options·status·effectiveAnswer·answerOrigin을 가진다. 내부 canonicalIdentity·answerSpan은 브라우저에 보내지 않는다. DocumentView는 documentKey·safeHtml·effectiveQuestions·warnings다. CommitResult는 실제 저장 결정의 공개 필드(questionKey·documentKey·selectedLetter·decidedAt)와 workspace를 포함한다. DB 전체 행은 반환하지 않는다.

Fastify 고정 JSON Schema로 object type·required·additionalProperties=false와 문자열·배열 형태를 검사한다. selections는 최소 1개, optionLetter는 대문자 한 글자다. 도메인 계층이 중복 키·활성 질문 소속·실제 선택지·원문 완료·같은/다른 값 재확정을 검증한다. Ajv 자동 타입 변환·기본값·추가 필드 제거를 끈다. Host·Origin·JSON POST 경계는 승인된 P-01 그대로 적용한다. error handler는 내부 스택·SQL·입력 원문을 응답으로 내보내지 않는다.

| 오류 code | HTTP | retryable·처리 |
| --- | --- | --- |
| INVALID_INPUT, INVALID_SELECTION | 400 | false; 입력·후보 전체 거부 |
| FORBIDDEN_ORIGIN, FORBIDDEN_HOST | 403 | false; 호출 전 거부 |
| DOCUMENT_NOT_FOUND, SOURCE_NOT_FOUND | 404 | false; 문서 또는 공개 경로 확인 |
| SOURCE_ACCESS_DENIED, SOURCE_REDIRECT | 422 | false; 공개 지원 범위·현재 URL 안내 |
| STALE_CONTEXT, DECISION_CONFLICT | 409 | false; 재연결 또는 후보 확인 |
| SOURCE_RATE_LIMIT | 503 | true; 사용자가 나중에 재시도, 자동 재시도 없음 |
| SOURCE_TIMEOUT | 504 | true; 기존 연결 유지 |
| SOURCE_UNAVAILABLE | 502 | true; 네트워크·GitHub 5xx |
| SOURCE_INVALID | 502 | false; 잘린 tree·비정상 blob·UTF-8 오류 |
| STORAGE_UNAVAILABLE | 503 | true; 잠금·일시 I/O 실패, 롤백 |
| STORAGE_INVALID, INTERNAL_ERROR, RENDER_FAILED | 500 | false; 원인 분류 후 안전한 메시지 |
| EXPORT_MISMATCH | 409 | false; 파일 전체 거부·재연결 안내 |

GitHub 403은 응답 헤더와 오류 정보를 내부에서 분류하여 요청 한도와 접근 불가를 구분한다. Fastify의 body 크기·지원 Content-Type 거부는 413·415로 정규화해 INVALID_INPUT을 반환한다. AppError 응답과 별개로 파싱·중복·미연결·원문 충돌은 Warning이며 연결 전체 실패로 바꾸지 않는다.

## SQLite 스키마와 마이그레이션

C6의 schema.ts에 아래 초기 DDL과 PRAGMA user_version=1 초기화 절차를 둔다. user_version=0이고 사용자 테이블이 없는 새 DB만 생성한다. 버전 1은 예상 테이블·컬럼·키를 검증하여 재사용하고, 알 수 없는 버전·기존 구조 불일치면 자동 삭제·재생성 없이 시작 실패다. 스키마 검사와 초기화는 트랜잭션 안에서 수행한다. 추가 마이그레이션 도구는 쓰지 않는다.

```sql
CREATE TABLE recent_connection (
  singleton_id INTEGER PRIMARY KEY CHECK (singleton_id = 1),
  repository_key TEXT NOT NULL,
  canonical_url TEXT NOT NULL,
  folder_path TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE decisions (
  repository_key TEXT NOT NULL,
  document_path TEXT NOT NULL,
  identity_version INTEGER NOT NULL CHECK (identity_version = 1),
  identity_digest TEXT NOT NULL,
  question_key TEXT NOT NULL,
  canonical_identity TEXT NOT NULL,
  selected_letter TEXT NOT NULL
    CHECK (length(selected_letter) = 1 AND selected_letter GLOB '[A-Z]'),
  decided_at TEXT NOT NULL,
  source_version_at_decision TEXT NOT NULL,
  unique_at_decision INTEGER NOT NULL CHECK (unique_at_decision = 1),
  PRIMARY KEY (repository_key, document_path, identity_version, identity_digest)
);
PRAGMA user_version = 1;
```

folder_path는 빈 문자열 허용, 문서 경로 대소문자 보존, decided_at은 서버 UTC ISO 8601이다. canonical_identity와 source_version_at_decision은 규약에 맞는 JSON 문자열로 저장하며 읽을 때 파싱·구조를 검증한다. 불일치·손상을 결정 없음으로 해석하지 않는다. 결정은 INSERT만 하며 같은 값 재요청은 기존 행 반환, 다른 값은 전체 롤백한다. 최근 연결 한 행만 성공한 새 연결로 갱신한다. DB 동기 transaction 안에는 await·네트워크를 넣지 않는다.

## 질문 키·원문·렌더링 계약

- repositoryKey는 정규화한 owner/repository 소문자 문자열. documentKey는 UTF-8 JSON.stringify([repositoryKey, relativePath])의 base64url이다.
- identityVersion=1, canonicalIdentity는 JSON.stringify([1, numberString, normalizedPrompt, orderedOptions])이며 orderedOptions는 각 [letter, normalizedContent]의 배열이다. 문구 정규화는 승인된 바깥 공백 제거·CRLF/CR의 LF 통일만 하고 내부 공백·대소문자·Markdown·순서를 보존한다.
- identityDigest는 canonicalIdentity UTF-8의 SHA-256 hex다. questionKey는 JSON.stringify([documentKey, 1, identityDigest])의 base64url이다. 키만 신뢰하지 않고 활성 맵·비교 문자열·현재 유일성을 함께 확인한다.
- snapshotId는 서버 crypto.randomUUID()로 새 연결마다 생성한다. sourceVersion은 고정 commitSha·blobSha·원문 Buffer SHA-256의 객체다. source_version_at_decision은 그 객체의 JSON이다.
- C4는 원문 Buffer와 줄별 바이트 표를 소유한 분석 입력을 사용한다. BOM·CRLF·UTF-8을 보존하고 토큰 줄 매핑에서 원문 답변 콜론·공백·위치를 재검증한다. 형식 오류와 반복 비교 그룹은 경고 후 제외한다.
- C5에는 sourceText와 DisplayContext(repositoryKey, canonicalUrl, commitSha, relativePath)를 전달한다. html=false 등 승인 설정과 URL 규칙을 적용하고, C4 분석 설정과 분리한다. 본문 heading fragment를 위해 heading_open 렌더 시 제목 텍스트로 안전한 id를 생성하고 동일 제목은 순서 접미사로 구분한다. 원문 fragment와 이 slug가 일치할 때 문서 내 이동이 동작한다.
- C7은 C2가 선별한 호환 확정 결정만 받는다. 답변 위치 외 바이트를 보존하고 역순 삽입 후 Buffer로 응답한다. 미확정 선택·원문 완료 답변은 변경하지 않는다.

GitHub 읽기에는 Accept=application/vnd.github+json, X-GitHub-Api-Version=2026-03-10과 고정 앱 User-Agent를 사용한다. api.github.com GET만 허용하며 응답 URL·리다이렉트는 따라가지 않는다. 요청 body 읽기까지 15초 중단 신호, 기본 브랜치의 한 커밋·tree·blob, 폴더 존재/빈 목록 구분은 승인된 P-02대로 구현한다. fetch 함수를 C3 생성자 옵션으로 주입해 테스트 fixture를 사용할 수 있게 하되 브라우저나 환경 변수로 API 호스트를 바꾸는 기능은 만들지 않는다.

## UI·자동화·검증 계약

ReviewPage(App.vue)가 workspace·선택 문서·documentView·pendingSelections·요청 순서를 소유한다. API 클라이언트는 같은 출처 상대 주소를 호출하고 JSON 오류와 다운로드 Buffer를 처리한다. Origin은 브라우저가 보내는 값을 사용한다. 질문·경고는 텍스트 바인딩, C5 safeHtml만 DocumentViewer의 HTML 삽입에 쓴다.

안정적인 data-testid는 connection-form-submit-button, connection-form-repository-input, connection-form-folder-input, document-list-open-button, decision-queue-option-radio, confirm-bar-submit-button, export-button-download-button, status-message-text로 정한다. 목록 항목은 같은 testid와 data-document-key 또는 data-question-key·data-option-letter를 조합해 특정 항목을 찾는다. 랜덤 UI ID를 만들지 않으며 label·fieldset·legend·disabled·진행/오류 텍스트를 제공한다.

자동 스모크 파일 하나에 소수의 여정별 test를 둔다. fixture는 GitHub 메타데이터·커밋·tree·base64 blob 응답을 반환하므로 실제 C3 URL·3xx·실패 처리와 C2 조립을 거친다. 저장 실패는 임시 DB의 테스트 전용 trigger 또는 주입된 저장 실패로 유도하되 실제 C6 트랜잭션 롤백도 확인한다. 앱 close·다시 조립 후 같은 임시 DB를 열어 재시작 의미를 검증한다. 별도 프로세스의 시작·중지와 화면은 SM-01에서 확인한다.

| 스토리 | 생성 단계 | 관찰 결과 |
| --- | --- | --- |
| US-01 | 6~9, 12~15 | 유효 공개 연결·기본 브랜치·지정 폴더, 잘못된 호스트 요청 전 거부, 오류/정상 빈 목록 구분 |
| US-02 | 9, 11~15 | 목록·문서 전환·안전 HTML, 링크 처리·키보드 |
| US-03 | 7, 10, 12~15 | 기본 질문·기응답 제외·문구/선택지·파싱 경고·모호한 그룹 처리 |
| US-04 | 7~8, 10, 12~15 | 복수 확정·롤백·같은 값 시각 유지·UI 선택 유지·재시작/재연결·최근 입력 복원 |
| US-05 | 7~8, 10~15 | 확정 답변만 삽입·BOM/CRLF/한글 바이트 보존·재파싱·원격 쓰기 없음 |

NFR-01·NFR-09는 단계 6·13·16·17, NFR-02는 9·13·15, NFR-03은 11·14·15, NFR-04·NFR-05는 8·12·15, NFR-06은 7·10~12·15, NFR-07은 7~15, NFR-08은 14·17로 연결한다. SM-01~SM-04는 Step 17에서 결과를 기록하고 Build and Test 단계에서는 해당 증거와 필요한 미검증 항목을 이어받는다.

실제 공개 GitHub 확인은 접근 가능한 공개 저장소와 문서 폴더의 URL·고정 커밋·확인 시각을 기록한다. 원격 파일을 만들거나 수정하지 않는다. 네트워크 제약으로 미수행이면 fixture 통과와 구분한다. 스토리 인수 체크박스는 관찰 근거가 있는 항목만 완료한다.

## 제외 항목·확장 준수

계층별 독립 대규모 unit 테스트·속성 기반 테스트·부하·성능·HA·복원력 테스트는 N/A이며 SM-01~SM-04로 한정한다. 배포 아티팩트·외부 인프라는 승인된 제외이므로 생성하지 않는다. 구현 요약에 제외 근거를 기록한다.

| 확장 | Enabled | 규칙별 결과 | 이유 |
| --- | --- | --- | --- |
| Security Baseline | No | 전체 규칙 N/A | 비활성 유지, 기존 최소 보안만 구현 |
| Property-Based Testing | No | 전체 규칙 N/A | 스모크 한정 |
| Resiliency Baseline | No | 전체 규칙 N/A | 복원력·성능·확장성·고가용성 제외 |

활성 확장 차단 항목은 없다. 계획 검증과 애플리케이션 실행 테스트 결과를 혼동하지 않는다.

## 계획 검증 결과와 다음 행동

19개 순차 단계, US-01~US-05·NFR-01~NFR-09·SM-01~SM-04, C1~C7 책임을 확인했다. Markdown 파싱·표 열 수·상대 링크와 메모리 SQLite에서 초기 DDL·테이블·user_version 구문을 검증했다. 애플리케이션 동작 테스트는 아니다. [전체 계획 검토](planrepo-code-generation-review-questions.md) 승인 후 Step 5를 기록하고 Step 6부터 실행한다.

## Step 17 검증 중 보완 범위

기존 구현과 승인 설계의 불일치를 수정한다. 기존 경로 github-source.ts의 URL 검증·비재귀 폴더 탐색·body timeout, question-parser.ts의 markdown-it 블록 문맥·CR 줄 표, renderer.ts의 제목 fragment·이미지 대체문자, planrepo-service.ts의 연결 원자성·경고, exporter.ts의 질문 단위 재사용, storage/schema.ts·decision-store.ts의 기존 구조·저장 데이터 검증을 보완한다. 새로운 기능 정책·계층·배포 범위를 추가하지 않는다. SM-02~SM-04 실패 근거와 수정 후 결과를 구현 요약에 기록한다.

## Step 17 실행 결과

서버·Vue 빌드, 자동 SM-02~SM-04 3개, npm start, 실제 공개 GitHub 읽기·로컬 HTTP 다운로드·정상 종료를 확인했다. @fastify/static을 Fastify 5 호환 10.1.3으로 갱신하고 잠금 파일을 반영해 취약점 조회 0건을 확인했다. 브라우저 연결 없음으로 SM-01 화면 조작은 미검증이며 Build and Test로 인계한다. 상세 근거는 [구현·검증 결과](../planrepo/code/implementation-summary.md)에 기록했다. Step 17 체크는 검증 수행 완료이며 미검증 화면 항목의 통과를 의미하지 않는다.

## Step 18 검토 준비

코드·스토리·설계·경로와 Markdown 파싱·표·상대 링크를 확인했다. 관찰 근거가 있는 인수 조건만 체크했으며 나머지 UI 조건은 유지했다. [코드 산출물 검토](planrepo-code-generation-artifact-review-questions.md)의 답변을 기다린다. 이전 계획 검토 파일의 답변 A는 계획 승인으로만 처리한다. Step 19와 Code Generation 단계 완료 체크는 코드 산출물의 명시적 승인 후 갱신한다.
