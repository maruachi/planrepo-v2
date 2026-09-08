# PlanRepo NFR 논리 구성 요소

## 기준

[설계 패턴](nfr-design-patterns.md), [NFR](../nfr-requirements/nfr-requirements.md), [기술 스택](../nfr-requirements/tech-stack-decisions.md), [단위 의존성](../../../inception/application-design/unit-of-work-dependency.md), [메서드 계약](../../../inception/application-design/component-methods.md)을 따른다. 기존 planrepo 단위 하나와 C1~C7을 유지한다. 아래 하위 책임은 코드 조직을 설명하며 새 배포 단위를 뜻하지 않는다.

## 구성 요소와 NFR 책임

| ID | 논리 구성과 구현 기술 | 소유 상태·수명 | NFR 패턴 |
| --- | --- | --- | --- |
| C1 ReviewUI | Vue ReviewPage, 폼·목록·뷰어·질문·확정·경고 표시. 같은 출처 HTTP 클라이언트 | workspace 표시 복사본·문서 선택·pendingSelections·requestSequence, 화면 수명 | P-01, P-03, P-07, P-08 |
| C2 PlanRepoService | TypeScript 도메인 서비스, Fastify HTTP 어댑터·고정 JSON Schema·오류 변환 | 활성 ReviewContext 하나, 연결·확정 순서 체인, 앱 프로세스 수명 | P-01, P-04~P-08 |
| C3 GitHubSource | URL·폴더 검증, api.github.com GET 어댑터, tree·blob 읽기·외부 오류 변환 | 요청별 읽기 결과·중단 신호만, 성공하면 SourceBundle을 C2에 전달 | P-02, P-06 |
| C4 QuestionParser | 블록 문맥용 markdown-it, 원문 줄·바이트 매핑, AI-DLC 규칙·중복 검출 | 입력과 출력만. 파싱 결과는 C2 소유, DB·네트워크 없음 | P-03, P-04 |
| C5 MarkdownRenderer | 별도 안전 표시 markdown-it, 링크·이미지 검증·상대 URL 해석 | 요청별 SafeHtml. 원문을 변경하거나 영속화하지 않음 | P-03, P-06 |
| C6 DecisionStore | better-sqlite3 연결·준비 SQL·동기 transaction | SQLite 연결은 앱 수명, recent_connection·decisions는 재시작 후 유지 | P-05, P-06, P-08 |
| C7 MarkdownExporter | Buffer·답변 위치 검증·역순 삽입·파일명 생성 | 요청별 DownloadFile, DB·네트워크 없음 | P-04, P-06 |

C5의 상대 URL 해석에는 C2가 검증한 저장소·고정 커밋·문서 경로를 표시 컨텍스트로 전달한다. 기존 render 계약을 구현할 때 추가되는 입력 메타데이터이며 C5가 C3를 호출하지 않는다. SafeHtml은 질문 식별·저장·내보내기의 원문으로 사용하지 않는다.

## 프로세스와 자원

| 자원 | 위치·소유 | 접근 경계 |
| --- | --- | --- |
| 브라우저 | 사용자 로컬 브라우저, C1 실행 | Fastify 같은 출처 API 호출. 본문 링크·이미지는 검증된 브라우저 URL로 표시 |
| 로컬 앱 | Node 24 LTS 프로세스 하나, C2~C7 | Fastify는 127.0.0.1에 바인딩, Host·Origin 검증, 계정·토큰 없음 |
| UI 정적 파일 | Vue/Vite 빌드 출력 | @fastify/static의 루트를 이 출력 디렉터리로 한정 |
| 메모리 컨텍스트 | C2 | 원문 Buffer·커밋·파싱 결과·SnapshotId. 재시작·재연결 성공 시 교체 |
| SQLite 파일 | C6, 빌드 출력·정적 루트 밖 | 최근 성공 연결과 확정 결정만 영속화. 소스 전체·미확정 선택 저장 없음 |
| 공개 GitHub API | C3의 유일한 서버 외부 출처 | api.github.com HTTPS GET. 임의 응답 URL·3xx·토큰 사용 없음 |

별도 클라우드·캐시 서버·작업 큐·관측 서비스·서버형 DB·컨테이너는 필요하지 않다. 로컬 promise 체인은 C2의 순서 보장 도구이며 영속 큐·백그라운드 작업 시스템이 아니다.

## 직접 의존성과 데이터 전달

| 호출자 | 대상 | 입력·출력·불변 조건 |
| --- | --- | --- |
| C1 | C2 | ConnectionInput 또는 SnapshotId와 문서·선택 목록. WorkspaceView·DocumentView·CommitResult·DownloadFile·AppError 수신 |
| C2 | C3 | 검증할 연결 입력, 완전한 SourceBundle 수신. 실패 시 활성 상태 유지 |
| C2 | C4 | 같은 SourceDocument Buffer, ParseResult 수신. 모호한 질문 제외·원문 위치 보존 |
| C2 | C5 | 원문 표시 문자열·검증한 문서 표시 컨텍스트, SafeHtml 수신 |
| C2 | C6 | 최근 입력·문서 키·확정 후보, 실제 DB 결과 수신. 성공 전 완료 응답 없음 |
| C2 | C7 | 현재 원문·파싱 결과·호환 확정 결정, DownloadFile 수신. 답변 위치 외 바이트 보존 |

C1 → C2 → C3~C7 구조에 순환은 없다. C4·C7은 C6이나 서로를 직접 호출하지 않는다. 반환값이 돌아오는 것은 역방향 의존성이 아니다. 공통 타입은 도메인 데이터만 담고 Fastify·Vue·SQLite 구현을 의존하지 않는다.

## 시작·정상 흐름·종료

1. 실행 진입점이 고정 Node·의존성 준비 상태를 확인하고 타입 검사·서버·UI 빌드를 수행한다. 단계 실패 시 서버 시작을 성공으로 안내하지 않는다.
2. C6이 영속 SQLite를 열고 예상 스키마를 초기화·검증한다. 실패 시 앱 시작 실패를 안내하고 기존 DB를 보존한다.
3. C2와 C3~C7을 조립한 뒤 Fastify의 입력·출처·오류 처리와 정적 UI를 등록하고 loopback 포트를 연다. 테스트는 앱 조립과 listen을 분리해 inject를 사용할 수 있게 한다.
4. C1이 최근 연결 입력을 읽고 사용자가 연결하면 C2가 순서 체인 안에서 C3 읽기·C4 분석·C6 병합·최근 연결 저장 후 활성 컨텍스트를 교체한다.
5. C1 문서 선택은 C2를 통해 C5 SafeHtml과 질문 상태를 받는다. 임시 선택은 C1에 남고 확정 시에만 C2 검증·C6 원자 저장을 요청한다.
6. C2 내보내기는 활성 원문과 현재 확정 결정을 읽어 C7에 전달한다. 결과 파일은 C1이 다운로드한다. 이 경로에 C3 호출·원격 쓰기는 없다.
7. 종료 시 Fastify가 요청 수락을 종료하고 진행 중 처리를 마친 다음 C6을 닫는다. 재시작 후 최근 입력·결정만 남으며 예전 SnapshotId는 유효하지 않다.

## SM-01~SM-04 연결과 인계

| 관찰 경로 | 통합 경계 | 검증 내용 |
| --- | --- | --- |
| SM-01 | 시작 진입점·정적 UI·C1·C2·C6 | 한 명령 실행, 같은 출처 API, DB 초기화, 키보드·진행·완료 표시 |
| SM-02 | C2·C3·C4·C5·C1 | 허용 Host·Origin과 입력, GitHub GET·리다이렉트 거부, 완전한 문서 집합, 유효 질문·경고·위험 HTML 비실행 |
| SM-03 | C1·C2·C4·C6 | 복수 확정·전체 롤백·같은 답변 시각 유지, 컨텍스트 변경 순서, 재시작·재연결·원문 우선 |
| SM-04 | C2·C6·C7 및 검증용 C4 재파싱 | 확정 답변만 반영, 원문 바이트 보존, 위치 오류 시 전체 거부, 원격 쓰기 없음 |

SM-04의 재파싱은 스모크 코드가 수행하며 C7→C4 런타임 의존성을 만들지 않는다. 실제 GitHub·브라우저 확인과 inject·fixture 결과를 구분한다. 광범위 테스트 모음은 추가하지 않는다.

Code Generation 계획은 실제 src/·tests/ 파일, HTTP 메서드·경로·스키마, C5 표시 컨텍스트 타입, SQLite 위치·SQL, 오류 코드·상태, 키 직렬화·digest, 종료 훅·실행 스크립트와 정확한 패치·잠금 파일을 정의한다. 인프라 단계는 이미 승인된 로컬 전용 조건으로 생략한다. 실제 구현·환경 준비는 Code Generation에서 수행한다.

## 확장 준수와 검증 상태

| 확장 | Enabled | 규칙별 결과 | 이유 |
| --- | --- | --- | --- |
| Security Baseline | No | 전체 규칙 N/A | 비활성, 기존 최소 입력·표시 경계만 적용 |
| Property-Based Testing | No | 전체 규칙 N/A | 스모크 테스트만 계획 |
| Resiliency Baseline | No | 전체 규칙 N/A | 복원력·성능·확장성·고가용성 제외 |

활성 확장 차단 항목은 없다. C1~C7 경계와 NFR 9개·SM-01~SM-04 연결을 문서로 검증한다. 신규 도식 없이 표·순서 설명을 제공하며 애플리케이션 빌드·동작 테스트는 후속 단계다.
