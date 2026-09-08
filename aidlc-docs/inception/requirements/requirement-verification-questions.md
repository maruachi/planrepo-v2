# MVP 요구사항 확인 질문

아래 질문의 `[Answer]:` 뒤에 선택지 문자를 입력해 주세요. 명시된 프로젝트 제약으로 이미 확정 가능한 항목은 미리 답변했습니다.

## Question 1
구축할 제품의 기준 요구사항은 무엇입니까?

A) `requirements/planrepo-requiremnets.md`에 정의된 PlanRepo 문서 협업 서비스

B) 테이블오더 서비스이며, 참조 문서는 잘못 지정됨

C) 테이블오더 서비스와 PlanRepo 기능을 결합한 서비스

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2
`1.r5시간`의 정확한 의미는 무엇입니까?

A) 1.5시간

B) 15시간

X) Other (please describe after [Answer]: tag below)

[Answer]: 1.5일

## Question 3
이번 MVP의 실행 및 전달 형태는 무엇입니까?

A) 로컬에서 명령 한 번으로 실행되는 단일 웹 애플리케이션, 배포 제외

B) 로컬 Docker 컨테이너로 실행되는 웹 애플리케이션, 외부 배포 제외

C) 외부에서 접속 가능한 환경까지 배포

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 4
Question 1에서 PlanRepo를 선택한 경우, 1.5시간 MVP의 외부 연동 범위는 무엇입니까?

A) 로컬 Markdown 폴더만 사용하고 GitHub 인증, GHE, LLM 연동은 제외

B) 공개 GitHub 저장소 읽기만 실제 연동하고 인증, GHE, LLM은 제외

C) GitHub OAuth와 비공개 저장소까지 실제 연동

D) PlanRepo를 선택하지 않았으므로 해당 없음

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 5
Question 1에서 테이블오더를 선택한 경우, 최소 핵심 경로는 무엇입니까?

A) 고객이 테이블을 선택하고 메뉴를 장바구니에 담아 주문하며, 직원이 주문 목록을 보고 상태를 변경

B) 고객의 메뉴 조회와 주문 제출까지만 구현하고 직원 화면은 제외

C) PlanRepo를 선택했으므로 해당 없음

X) Other (please describe after [Answer]: tag below)

[Answer]: 테이블 오더는 진행 안 합니다.

## Question 6
MVP 데이터 저장 방식은 무엇입니까?

A) SQLite 파일에 저장하여 재시작 후에도 유지

B) 메모리에만 저장하며 재시작 시 초기화

C) 별도 서버형 데이터베이스 사용

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 7
Security Baseline 확장 규칙을 적용할까요?

A) 예 - 모든 Security Baseline 규칙을 차단 조건으로 적용

B) 아니요 - 확장 규칙은 끄고 MVP에 필요한 기본 입력 검증과 비밀정보 비노출만 적용

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 8
Property-Based Testing 확장 규칙을 적용할까요?

A) 예 - 모든 속성 기반 테스트 규칙 적용

B) 부분 적용 - 순수 함수와 직렬화 왕복만 적용

C) 아니요 - 핵심 경로 스모크 테스트만 수행

X) Other (please describe after [Answer]: tag below)

[Answer]: C

## Question 9
Resiliency Baseline 확장 규칙을 적용할까요?

A) 예 - 복원력 설계 지침 적용

B) 아니요 - 성능, 확장성, 고가용성 및 복원력 설계 제외

X) Other (please describe after [Answer]: tag below)

[Answer]: B
