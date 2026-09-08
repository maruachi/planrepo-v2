# PlanRepo 실행 안내

공개 GitHub 저장소의 기본 브랜치에서 Markdown을 읽고, 미결정 질문에 답변을 확정하여 Markdown으로 내려받는 로컬 앱이다. TypeScript/Fastify와 Vue를 사용하며 최근 연결과 확정 결정은 SQLite에 저장한다.

## 준비와 시작

작업공간 루트에서 실행한다. Node 24.12.0, npm 11.6.2와 package-lock.json을 기준으로 한다. nvm 사용 시 `nvm install`과 `nvm use`로 .nvmrc를 적용한다. 기존 의존성이 없으면 `npm ci`를 한 번 실행한다. better-sqlite3 사전 빌드가 없는 환경은 네이티브 빌드 도구가 필요할 수 있다.

`npm start`가 런타임 확인, 서버·UI 타입 검사와 빌드를 수행한 후 앱을 시작한다. 브라우저에서 `http://127.0.0.1:3000`을 연다. 종료는 Ctrl+C다. 빌드한 뒤 바로 실행하려면 `node dist/server/main.js`를 사용한다.

| 명령 | 용도 |
| --- | --- |
| npm run check:runtime | 지원 Node 확인 |
| npm run typecheck | 서버·Vue 타입 검사 |
| npm run build | 타입 검사와 서버·UI 빌드 |
| npm run test:smoke | 서버 빌드 후 SM-02~SM-04 자동 스모크 |
| npm start | 빌드 후 로컬 앱 시작 |

## 설정과 저장 위치

| 설정 | 기본값 | 의미 |
| --- | --- | --- |
| PLANREPO_PORT | 3000 | 로컬 HTTP 포트 |
| PLANREPO_DB_PATH | .local/planrepo.sqlite | 작업공간 기준 또는 절대 SQLite 경로 |

서버는 127.0.0.1에만 바인딩한다. UI 빌드 출력인 dist/client만 정적으로 제공한다. DB는 정적 UI 디렉터리 안에 둘 수 없다. .local과 dist는 Git 제외 대상이다. DB를 삭제하면 확정 답변과 최근 연결도 소실되므로 앱은 손상 DB를 자동 삭제하지 않는다.

## 사용 순서

1. 공개 `https://github.com/owner/repository` URL과 저장소 내 폴더를 입력한다. 빈 폴더·`.`는 루트이며 하위 폴더도 읽는다.
2. 문서 목록에서 본문을 읽고 전체 대기열에서 라디오 답변을 고른다. 문서 전환은 선택을 유지한다.
3. 선택한 답변을 일괄 확정한다. 저장 성공 시 대기열에서 제거된다. 실패 시 선택을 유지한다. 응답이 불확실하면 저장 상태 다시 확인을 사용한다.
4. 선택 문서의 Markdown을 내려받는다. 본문은 조회 원문이며 다운로드에만 확정 답변이 반영된다. 미확정 선택은 포함하지 않는다.
5. 앱 재시작 후 최근 입력은 복원된다. 저장소를 다시 연결하면 유일하게 일치하는 질문에 저장 답변을 적용한다.

## SM-01 브라우저 확인 절차

임시 DB로 `npm start`를 실행하고 위 로컬 주소를 연다. 질문이 있는 공개 문서 또는 테스트 fetch fixture를 주입한 앱에서 연결 → 문서 전환 → 라디오의 Tab·방향키 선택 → 여러 답변 확정 → Markdown 다운로드를 확인한다. 잘못된 URL 오류, 선택 유지, 완료 상태, 빈 목록, 최근 입력 복원도 짧게 확인한다. 브라우저 fixture 주입은 테스트에서 createApp의 fetcher 옵션으로만 수행하며 제품 환경 설정이나 API로 제공하지 않는다.

실제 GitHub는 공개 URL·폴더·관찰 시각·고정 커밋을 결과에 기록한다. fixture 통과와 실연동을 구분한다. 외부 네트워크·요청 한도 등으로 확인하지 못한 항목은 미검증으로 남긴다.

## 범위와 결과

인증·토큰·비공개 저장소·원격 변경·배포·성능·확장성·고가용성·속성 기반 테스트는 제외한다. 확장 Security/PBT/Resiliency는 모두 비활성이며 모든 확장 규칙은 N/A다. 기존 최소 입력·표시·저장 안전성은 유지한다.

자세한 API는 [api.md](api.md), 실제 검증 결과와 제약은 [implementation-summary.md](implementation-summary.md)를 참조한다.

## 로컬 Git 소스

연결 화면에서 `로컬 Git`을 선택하고 PlanRepo 작업공간 안의 절대 저장소 루트와 문서 폴더를 입력한다. 앱은 현재 `HEAD`의 Markdown만 읽으며 작업 트리와 Git 상태를 변경하지 않는다.
