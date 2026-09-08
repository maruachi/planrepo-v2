# PlanRepo 구현·검증 결과

## 구현 상태

2026-09-08 Code Generation Steps 6~18 산출물 생성·검증·검토 준비 완료. Step 19 코드 산출물 승인은 대기 중이다. 애플리케이션은 루트 src, tests, scripts와 설정에 있으며 문서만 aidlc-docs에 있다. HTTP API 6개, Vue 검토 화면, SQLite 저장, 질문 파서와 Markdown 내보내기를 연결했다.

## 검증 결과

| 항목 | 결과·근거 |
| --- | --- |
| 서버·Vue 타입 검사와 빌드 | npm run build 통과. 최종 서버 수정 뒤 npm run test:smoke에서 서버 재컴파일 통과 |
| SM-01 로컬 시작·HTTP | npm start로 런타임 확인·전체 빌드·127.0.0.1:3107 listen 성공. 정적 HTML/JS/CSS 200, API 연결·열람·다운로드 성공 |
| SM-01 브라우저 조작 | 미검증. Browser runtime에서 No browser is available, 목록 [] 확인. 화면 배치·키보드·선택 유지·브라우저 파일 저장은 Build and Test에서 확인 필요 |
| SM-02 연결·파싱·렌더링 | 통과. URL/Host/Origin/JSON 거부, 폴더·빈 목록·실패 유지, HTML·코드·중첩 제외, 경고·제목 링크·이미지 대체 텍스트 |
| SM-03 확정·재시작·병합 | 통과. 실제 임시 SQLite 실패 trigger의 전체 롤백, 같은 답변·시각 보존, 앱 재조립, 질문 밖 변경 재사용, 원문 우선·충돌·미연결 경고, 손상 결정 거부 |
| SM-04 내보내기·바이트 보존 | 통과. 미확정 미반영, 복수 답변, BOM/CRLF/한글/끝 개행 없음의 바이트 비교, CR 파싱, 재파싱, 잘못된 위치 전체 거부 |
| 최종 자동 스모크 | tests/core.smoke.test.mjs의 여정 3개 모두 통과, 실패 0 |
| 실프로세스 재시작·종료 | 최근 실제 연결 복원 확인. SIGTERM 후 exit 0, 검증용 서버 종료 |
| 정적 제공 경계 | /src/server/main.ts, /.local/planrepo.sqlite, /package.json 모두 404 |
| 의존성 | @fastify/static 8.3.0의 high 1건을 10.1.3으로 수정. 설치 후 npm audit 결과 0 vulnerabilities |

fixture는 실제 GitHub의 성공 증거와 구분한다. API·생성 코드 검증은 화면 조작 검증을 대신하지 않는다. 스토리 인수 체크박스는 검증 근거가 있는 항목만 완료했으며 UI 관찰 항목은 남겼다.

## 실제 공개 GitHub 확인

2026-09-08T05:48:10Z에 https://github.com/octocat/Spoon-Knife 의 루트 폴더를 실제 C3로 읽었다. 기본 브랜치 main, 고정 commit d0dd1f61b33d64e29d8bc1372a94ef6a2fee76a9, README.md 780바이트를 확인했다. 이 공개 예시는 AI-DLC 질문이 없는 문서이며 질문·답변 경로는 fixture 스모크로 검증했다.

2026-09-08T06:08:41Z에는 실제 로컬 HTTP 앱의 최근 연결 복원 → 공개 저장소 재연결 → 문서 safeHtml → Markdown attachment 780바이트를 확인했다. HTML/JS/CSS 정적 제공과 소스·DB 경로 404, 정상 종료까지 통과했다. 원격 요청은 GET뿐이며 저장소를 수정하지 않았다. 검증 DB는 /private/tmp/planrepo-validation-20260908.sqlite에 격리했다.

## 발견·수정한 불일치

- GitHub URL 계정정보·비기본 포트·점 이동·역슬래시와 절대 폴더를 요청 전에 거부한다. 승인된 폴더별 비재귀 tree 탐색을 적용하고 symlink·submodule은 따라가지 않는다. timeout은 응답 body 읽기까지 유지한다.
- 파서는 markdown-it 블록 문맥으로 HTML·코드·목록·인용을 제외한다. Markdown이 reference 정의로 읽는 비어 있지 않은 [Answer] 줄도 원문에서 검사한다. CR/LF/CRLF·BOM 바이트 표를 사용한다.
- 새 연결의 결정 조회까지 성공한 뒤 최근 연결·활성 컨텍스트를 교체한다. 원문 답변 충돌과 미연결 결정 경고를 추가했다.
- 내보내기는 전체 문서 버전이 달라도 유일한 질문 내용이 같으면 확정 답변을 적용한다. 현재 원문 digest·답변 범위를 검증하고 나머지 바이트를 보존한다.
- 기존 SQLite 테이블·컬럼·기본 키와 저장된 비교 튜플·키·선택값을 검증한다. 초기화 실패 시 DB 핸들을 닫고 자동 삭제하지 않는다.
- 렌더러의 제목 fragment와 이미지 alt를 보완했다. 정적 파일 접근 거부는 내부 오류 500 대신 자원 없음 404로 반환한다.

초기 스모크 실패를 수정한 뒤 3개 여정이 모두 통과했다. 최종 서버 변경은 동일 스모크와 실제 HTTP로 재검증했다. 브라우저 연결이 없다는 외부 제약은 미검증으로 남겼다.

## 버전·근거

Node 24.12.0, npm 11.6.2, Fastify 5.12.3, @fastify/static 10.1.3, better-sqlite3 12.11.1, markdown-it 14.3.1, Vue 3.5.42, Vite 7.3.6. 전체 정확한 해석 버전은 루트 package-lock.json에 고정되어 있다.

GitHub tree 모드와 비재귀 탐색은 [공식 tree API](https://docs.github.com/en/rest/git/trees), 2026-03-10 헤더는 [공식 API 버전](https://docs.github.com/en/rest/about-the-rest-api/api-versions)을 확인했다. 정적 플러그인 업데이트는 [10.1.3 소스](https://github.com/fastify/fastify-static/tree/v10.1.3)와 npm audit의 수정 버전 정보를 확인하고 실제 앱 등록·빌드·스모크로 검증했다.

## 추적성과 제외

US-01 연결·목록, US-02 안전한 본문, US-03 파싱·대기열, US-04 원자 확정·유지, US-05 다운로드를 구현했다. NFR-01~NFR-09의 승인된 최소 범위를 유지한다. SM-01 화면 조작 관련 인수 조건은 후속 확인 대상이다.

| 확장 | Enabled | 규칙별 준수 |
| --- | --- | --- |
| Security Baseline | No | 전체 규칙 N/A: 승인된 비활성, 기존 최소 보안만 구현 |
| Property-Based Testing | No | 전체 규칙 N/A: 스모크 한정 |
| Resiliency Baseline | No | 전체 규칙 N/A: 성능·HA·복원력 제외 |

활성 확장 차단 항목은 없다. 배포 산출물·성능·부하·HA·복원력·계층별 대규모 테스트는 제외한다.

실행 안내는 [README](README.md), HTTP 계약은 [API](api.md), 세부 책임은 [업무](business-logic-summary.md), [API 계층](api-layer-summary.md), [저장](repository-layer-summary.md), [UI](frontend-summary.md)를 참조한다.
