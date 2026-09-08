# PlanRepo NFR 설계 패턴

## 기준과 상태

[NFR 요구사항](../nfr-requirements/nfr-requirements.md)과 [스택](../nfr-requirements/tech-stack-decisions.md)은 2026-09-08 승인됐다. 이 설계는 2026-09-08 사용자 채팅 `진행해줘.`로 승인됐다. [계획](../../plans/planrepo-nfr-design-plan.md), [논리 구성 요소](logical-components.md), [기능 알고리즘](../functional-design/business-logic-model.md), [업무 규칙](../functional-design/business-rules.md), [도메인](../functional-design/domain-entities.md), [화면 설계](../functional-design/frontend-components.md)를 함께 따른다.

아래는 구현할 설계이며 실행된 코드가 아니다. 기존 로컬 단일 앱·1.5일·스모크 범위를 유지한다.

## P-01 로컬 실행과 요청 검증

Fastify는 127.0.0.1에만 바인딩하고 trustProxy를 끈다. 실행 시 정한 포트를 포함해 허용 Host를 127.0.0.1과 localhost로 한정한다. UI는 같은 Fastify의 정적 자원으로 제공한다. 정적 파일 루트는 UI 빌드 출력만 지정하여 소스·SQLite·설정 파일을 노출하지 않는다.

연결·확정 등 상태 변경은 JSON POST로만 받는다. Origin이 요청 Host로 구성한 허용 로컬 출처와 정확히 일치해야 하며 누락·null·다른 출처는 거부한다. 광범위 CORS 허용은 추가하지 않는다. 읽기 요청도 Host를 검증하고 Origin이 존재하면 같은 출처를 확인한다. 자동 스모크는 이 계약에 맞는 Host·Origin을 제공한다. 이 경계는 로컬 브라우저에서 임의 요청을 유발하는 것을 줄이는 최소 입력 처리이며 사용자 계정·인증을 도입하지 않는다. 같은 컴퓨터의 악성 프로세스 차단을 보장하지 않는다.

body·params·query는 코드에 고정한 완전한 JSON Schema로 검증한다. 요청 객체에는 additionalProperties=false를 사용하고 Ajv의 removeAdditional=false, coerceTypes=false, useDefaults=false를 설정해 잘못된 추가 필드·타입을 조용히 수정하지 않는다. HTTP header 객체 전체에 additionalProperties=false를 적용하지 않는다. 선택 문자는 서버에서 해당 질문의 유효 선택지인지 별도로 검증한다. 클라이언트가 보낸 시각·원문·SQL·바이트 위치는 받지 않는다.

Fastify 기본 Ajv는 타입 변환·추가 속성 제거 등을 수행하므로 위 값은 명시적인 프로젝트 설정이다. [Fastify 검증 문서](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/)

## P-02 검증된 GitHub 읽기와 완전한 문서 집합

사용자 저장소 URL은 공백을 정리한 뒤 URL 파서와 원문 검사로 검증한다. HTTPS, 정확한 github.com 호스트, 기본 포트, owner/repository 두 경로 요소만 허용한다. 계정정보·쿼리·fragment·역슬래시·제어문자·추가 tree/blob 경로는 거부한다. 선택적 .git·마지막 슬래시는 정규화한다. owner/repository는 비어 있지 않은 허용 문자로 검증하고 인코딩된 구분자·점 경로를 허용하지 않는다. URL 파서가 경로를 정리하기 전에 입력의 점 이동·역슬래시를 검사한다.

folderPath는 기존 규칙대로 빈 값·점을 루트로 해석하고 앞뒤 공백·마지막 슬래시를 정리한다. 절대 경로·역슬래시·상위 이동·제어문자는 거부한다. Git 경로는 URL이 아닌 경로 요소 목록으로 취급하고, 요청 구성 시 각 요소를 한 번만 인코딩한다. 퍼센트가 포함된 Git 파일명은 리터럴로 다루고 후속 재디코딩으로 경로 이동을 허용하지 않는다. API에서 받은 항목도 해당 트리의 단일 이름인지 검증한다.

C3의 네트워크 출처는 https://api.github.com 하나다. 서버가 검증한 owner/repository·브랜치·객체 식별자로 GET 주소를 직접 만든다. 응답의 url·download_url·문서 링크를 다음 fetch 주소로 사용하지 않는다. 리다이렉트는 manual로 받고 모든 3xx를 접근 오류로 처리한다. 이동된 저장소는 현재 URL 입력을 안내한다. 토큰·쿠키·Authorization은 보내지 않으며 API 버전과 User-Agent는 코드에서 고정한다.

읽기 순서는 저장소 메타데이터의 기본 브랜치 확인, 해당 브랜치의 커밋과 루트 tree SHA 고정, 폴더 요소별 tree 탐색, 하위 tree와 일반 .md blob 읽기다. 기본 설계는 비재귀 tree 조회를 하위 폴더별로 순차 수행하므로 다른 폴더까지 전체 저장소를 읽지 않는다. tree의 truncated=true, 비정상 응답, 선택 폴더가 tree가 아닌 경우는 연결 실패로 처리한다. symlink와 submodule은 따라가지 않고 지원하지 않는 항목으로 안내한다. 일반 파일 모드의 .md만 문서 집합에 포함한다. 폴더가 실제로 존재하고 .md가 없는 경우만 정상 빈 목록이다.

공개 tree·blob GET은 인증 없이 사용할 수 있다. tree 응답의 잘림은 완전한 파일 목록으로 취급할 수 없다. [GitHub tree API](https://docs.github.com/en/rest/git/trees)

blob은 고정 SHA로 JSON 응답을 받아 base64를 Buffer로 복호화한다. encoding·size·객체 식별자를 검증하고 UTF-8 해석 불가 시 연결 실패를 표시한다. 원본 Buffer를 보존하여 표시용 문자열과 구분한다. GitHub blob API는 base64 콘텐츠를 제공한다. [GitHub blob API](https://docs.github.com/en/rest/git/blobs)

각 HTTP 요청은 응답 body 읽기까지 종료될 수 있도록 15초 중단 신호를 둔다. 이는 오류 처리 기본값이며 지연 SLA가 아니다. 자동 재시도·백오프·회로 차단기는 추가하지 않는다. timeout·요청 한도는 사용자에게 재시도 가능한 오류로 전달한다. 모든 문서 읽기·파싱·결정 조회·최근 연결 저장까지 성공해야 연결 전체 성공이다. 파싱 경고는 유효 질문과 함께 유지한다.

## P-03 질문 분석과 안전한 표시의 분리

C4는 블록 분석용 markdown-it 인스턴스에서 HTML 블록 식별을 켜되 그 렌더링 결과를 UI로 보내지 않는다. 최상위 heading·paragraph의 문맥과 fence·code·blockquote·list·html_block 제외 범위를 이용한다. 원문 줄 표와 토큰의 줄 매핑을 결합하고 실제 AI-DLC 표식은 원문 줄에서 다시 검사한다. 전역 정규식 하나로 코드 예시나 중첩 블록 속 질문을 추출하지 않는다. 잘못된 영역·반복 비교 정보 그룹은 BR-03·BR-04의 경고로 처리한다.

C5는 표시 전용 인스턴스를 별도로 만들고 html=false, linkify=false, typographer=false, breaks=false를 명시한다. 원시 HTML은 이스케이프된 텍스트로 표시하고 신뢰하지 않는 플러그인·HTML을 반환하는 코드 하이라이터는 쓰지 않는다. 링크·이미지는 검증된 URL만 속성으로 출력하며 markdown-it의 URL 검증을 약화시키지 않는다. javascript·vbscript·file·data와 제어문자 기반 우회는 허용하지 않는다. 사용자 내용은 Vue 템플릿으로 컴파일하지 않는다.

상대 문서 링크는 현재 원문 문서의 저장소 경로와 고정 커밋을 기준으로 GitHub blob HTTPS 링크로 해석하고, 상대 이미지는 같은 버전의 raw.githubusercontent.com HTTPS 주소로 해석한다. 저장소 루트를 벗어나는 이동은 비활성 텍스트·대체 텍스트로 표시한다. 문서 fragment 링크는 본문 내부 식별자로만 취급한다. 절대 링크는 http·https·mailto, 절대 이미지는 http·https만 허용한다. 링크를 새 탭으로 여는 경우 noopener noreferrer를 적용한다. C3는 이 링크·이미지를 프록시 fetch하지 않으며 이미지 요청은 브라우저가 처리한다. 저장소 파일 경로를 로컬 앱 경로로 연결하지 않는다.

C1은 본문에만 C5의 SafeHtml을 사용한다. 질문·선택지·원문 답변·경고·오류는 Vue 텍스트 바인딩이다. SafeHtml 타입명만으로 안전성이 생기지 않으므로 C5 결과 생성 경계를 단일화한다. Vue는 일반 텍스트를 이스케이프하지만 명시적 HTML 삽입은 별도의 주의가 필요한 경계다. [Vue 보안 안내](https://vuejs.org/guide/best-practices/security.html), [markdown-it API](https://markdown-it.github.io/markdown-it/index.html)

## P-04 바이트 보존과 질문 식별

원문 Buffer에서 CRLF·CR·LF와 BOM을 보존하는 줄별 시작·끝 바이트 표를 만든다. 파싱용 문자열의 줄바꿈 정규화와 첫 BOM 제거는 분석 복사본에만 적용한다. 분석기의 위치는 줄 인덱스를 통해 원문 바이트 표로 매핑하고 답변 콜론·공백·줄 끝을 원문에서 재확인한다. 한글·이모지의 JavaScript 문자열 길이를 원문 바이트 길이로 사용하지 않는다.

번호 문자열, 질문 문구와 순서 있는 선택지의 비교 튜플·identityVersion을 직렬화하고 다이제스트와 원본 비교 정보를 함께 검증한다. 정확한 직렬화 표현은 Code Generation 계획에 정의한다. 같은 문서의 유일한 질문 내용 일치만 재사용하고, 비어 있지 않은 원문 답변을 우선한다. 문서 전체 변경만으로 호환 결정을 무효화하거나 모호한 질문에 결정을 추측 연결하지 않는다.

C7은 활성 원문 버전, 질문의 유일성·빈 답변·호환 결정·삽입 위치·범위 비중첩을 확인한 뒤 역순 바이트 삽입한다. 콜론 뒤 공백이 없으면 공백 하나와 선택 문자를 넣고, 기존 수평 공백이 있으면 그 뒤에 문자만 넣는다. 답변 위치 외 바이트를 그대로 유지한다. 범위 불일치 한 건이면 전체 내보내기를 거부한다. 파일명은 경로 마지막 요소에서 제어문자·경로 구분자를 제거하고 응답 헤더에 안전하게 인코딩한다. 원문 HTML 역변환·미확정 선택 반영은 없다.

## P-05 원자 저장과 활성 컨텍스트 적용 순서

C6만 SQLite 연결을 소유한다. recent_connection과 decisions는 도메인 모델의 키·필수 필드·유일성 제약을 구현한다. 값은 SQL 바인딩으로 전달하며 오류를 성공이나 빈 결과로 바꾸지 않는다. 새 결정과 동일 문자 재요청이 섞여도 하나의 동기 transaction에서 기존 행·비교 정보를 다시 읽고 전부 검증·저장한다. 같은 값이면 기존 행과 최초 decidedAt을 반환하며 다른 값이면 예외로 전체 롤백한다. 네트워크 호출·await는 transaction 안에 넣지 않는다. 성공 응답은 커밋 후 실제 저장된 값으로 만든다. [better-sqlite3 트랜잭션 API](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md)

C2의 연결·확정 작업은 프로세스 내부 promise 체인으로 순서를 정한다. 이 체인은 별도 작업 큐 서비스가 아니며 실패 뒤에도 다음 작업이 실행되도록 rejection을 정리한다. 연결은 읽기부터 최근 연결 저장·컨텍스트 교체까지 순서를 유지한다. 확정은 차례가 왔을 때 SnapshotId를 다시 검증하고 동기 DB 커밋까지 마친다. 따라서 이전 컨텍스트 확정이 연결 교체 뒤에 저장되는 일이 없다. 새 연결 실패는 기존 컨텍스트와 DB 최근 연결을 그대로 유지한다.

조회·내보내기는 작업 시작 시 현재 컨텍스트를 한 번 잡고 관련 SnapshotId를 검증한다. C4·C5·C6·C7 처리와 응답 모델 생성은 비동기 외부 요청 없이 그 컨텍스트 기준으로 수행한다. 원문 교체 전후 결과가 UI에 늦게 도착하는 경우에는 P-07의 요청 순서 검사를 적용한다.

앱 종료 시 새 요청 수락을 끝내고 진행 중 요청 처리를 마친 뒤 C6 연결을 닫는다. 재시작 시 DB는 유지하되 원문·SnapshotId는 새로 만든다. 손상·열기 실패 DB를 자동 삭제하거나 메모리 DB로 대체하지 않는다. 시작 실패를 명확히 안내한다.

## P-06 오류를 사용자 계약으로 변환

| 상황 | 사용자 오류와 재시도 | 상태 |
| --- | --- | --- |
| 입력·호스트·출처·후보 형식 오류 | 수정할 입력을 안내, retryable=false | 외부 요청·저장 없음 |
| 저장소·브랜치·폴더 접근 불가 또는 리다이렉트 | 공개 저장소와 현재 경로 확인, retryable=false | 이전 연결 유지 |
| 요청 한도·timeout·네트워크·GitHub 5xx | 잠시 후 연결 재시도, retryable=true | 이전 연결 유지 |
| 잘린 tree·비정상 blob·UTF-8 불가 | 완전한 문서를 읽지 못했다는 오류, retryable=false | 새 연결 활성화 없음 |
| 파싱·중복·답변 충돌 | 원문 문서·줄·이유가 있는 Warning | 유효 질문 유지, 오연결 없음 |
| 만료 SnapshotId | 다시 연결 안내, retryable=false | 현재 컨텍스트 유지, 저장 없음 |
| DB 잠금·일시 I/O 실패 | 저장 실패, retryable=true | 전체 롤백, UI 선택 유지 |
| DB 손상·스키마·예상 밖 내부 오류 | 로컬 상태 확인 안내, retryable=false | 실패를 성공으로 표시하지 않음 |
| 렌더링·내보내기 검증 실패 | 작업 오류·다시 연결 안내, retryable=false | 위험 HTML 또는 부분 파일 반환 없음 |

code·message·retryable의 정확한 오류 코드와 HTTP 상태 매핑은 Code Generation 계획에 적는다. retryable은 같은 입력을 사용자가 다시 시도할 수 있다는 뜻이며 자동 재시도 명령이 아니다. API에는 내부 스택·SQL·절대 DB 경로·원격 응답 body를 노출하지 않는다. 서버 로그도 원문·답변·전체 요청 body를 덤프하지 않고 오류 종류와 작업 이름 위주로 남긴다. 별도 관측·모니터링 시스템은 추가하지 않는다.

## P-07 화면 상태와 저장 사실 일치

ReviewPage만 임시 선택 맵을 소유한다. 문서 전환은 임시 선택을 지우지 않는다. 연결·확정 중 중복 제출을 막고 저장 중에는 연결·답변 변경·다운로드를 비활성화한다. 성공한 CommitResult만 완료 표시와 대기열 제거에 사용한다. 실패는 해당 선택을 유지한다. 성공 응답이 유실되면 같은 답변 재요청 또는 현재 workspace 조회로 실제 상태를 확인한다.

문서 열람 응답은 요청 순서·SnapshotId·DocumentKey가 현재 값과 모두 일치할 때 적용한다. 새 연결 성공 시 임시 선택을 초기화하고 실패 시 기존 상태를 유지한다. 최근 연결 입력 복원 후 원문은 사용자가 다시 연결한다. 키보드 라디오 선택, 질문·선택지 레이블, 선택 개수·작업 진행·오류·경고·빈 상태·완료 텍스트를 제공한다. 다운로드에는 확정 답변만 포함한다고 표시한다.

## P-08 실행·재현과 스모크

Node 24 LTS와 승인된 도구를 고정하고 npm 잠금 파일로 재설치한다. 시작 명령은 준비된 의존성으로 서버·Vue 타입 검사와 빌드 후 Fastify 하나를 실행한다. DB는 정적 제공·빌드 청소 대상 밖에 두고 앱 시작 때 필요한 스키마를 비파괴적으로 초기화한다. 실행 실패는 원인별 안내를 제공한다. 정확한 경로·패치·스크립트는 코드 생성 계획에서 확정한다.

node:test·Fastify inject·실제 임시 SQLite 파일로 SM-02~SM-04 핵심 흐름을 묶는다. Host·Origin·추가 필드 거부, 3xx 우회 거부, raw HTML 비실행, 중복 질문, 부분 저장 실패·같은 값 재요청, BOM·한글·CRLF 보존을 해당 흐름에 포함한다. SM-01 브라우저 조작과 실제 공개 GitHub 읽기는 별도 결과로 기록한다. fixture가 외부 실연동 성공을 증명하지 않는다.

## NFR 추적성

| NFR | 패턴 | 구성 요소 | 기존 스모크 |
| --- | --- | --- | --- |
| NFR-01 | P-01, P-08 | C1, C2, C6 | SM-01 |
| NFR-02 | P-01, P-02, P-05 | C2, C3, C6 | SM-02, SM-03 |
| NFR-03 | P-03 | C1, C5 | SM-02 |
| NFR-04 | P-05 | C2, C6 | SM-03 |
| NFR-05 | P-05, P-07 | C1, C2, C6 | SM-03 |
| NFR-06 | P-02, P-03, P-04 | C2, C3, C4, C7 | SM-02, SM-03, SM-04 |
| NFR-07 | P-02, P-05, P-06, P-07 | C1~C6 | SM-02, SM-03 |
| NFR-08 | P-07 | C1, C2 | SM-01, SM-03 |
| NFR-09 | P-08 | C1~C7 | SM-01~SM-04 |

BR-01·BR-02는 P-02·P-05, BR-03~BR-06은 P-03·P-04, BR-07~BR-10은 P-05·P-07, BR-11은 P-04, BR-12는 P-03으로 연결한다.

## 확장 준수·제외

| 확장 | Enabled | 규칙별 결과 | 이유 |
| --- | --- | --- | --- |
| Security Baseline | No | 전체 규칙 N/A | 전체 규칙 미로드·미적용. 승인된 최소 보안만 구현 설계 |
| Property-Based Testing | No | 전체 규칙 N/A | 핵심 스모크 한정 |
| Resiliency Baseline | No | 전체 규칙 N/A | 복원력·성능·확장성·고가용성 제외 |

활성 차단 항목은 없다. 캐시·분산 큐·자동 재시도·회로 차단·서버형 DB·배포·계정·원격 쓰기는 추가하지 않는다. 문서 검증만 수행하며 동작 테스트 통과를 주장하지 않는다.
