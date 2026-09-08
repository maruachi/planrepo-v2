# 로컬 저장소 지원 요구사항 확인

현재 PlanRepo는 공개 GitHub URL만 입력받아 문서를 읽습니다. 로컬 저장소 지원에는 파일 시스템 경로와 읽을 파일의 기준을 정해야 합니다. 기존 확장 규칙 설정은 모두 비활성 상태로 유지합니다.

## Question 1
로컬 저장소는 어떤 방식으로 지정해야 하나요?

A) 화면에서 절대 경로의 저장소 루트와 문서 폴더 경로를 입력한다. 기존 GitHub 연결 화면의 입력 방식을 확장한다.

B) 화면에서 Markdown 문서 폴더의 절대 경로만 입력한다. 저장소 루트와 문서 폴더를 구분하지 않는다.

C) 서버 시작 환경 변수에 미리 설정한 저장소 목록에서 선택한다.

X) Other (please describe after [Answer]: tag below)

	[Answer]: A

## Question 2
서버가 로컬 파일을 읽을 수 있는 경로 범위는 어떻게 제한해야 하나요?

A) 사용자가 화면에 입력한 모든 읽기 가능한 절대 경로를 허용한다. 서버는 로컬 루프백 주소로만 실행한다.

B) PlanRepo 애플리케이션 작업공간과 그 하위 경로만 허용한다.

C) `PLANREPO_LOCAL_ROOTS` 환경 변수에 설정한 허용 루트와 그 하위 경로만 허용한다.

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 3
로컬 원본으로 인정할 디렉터리 조건은 무엇인가요?

A) `.git` 메타데이터가 있는 Git 작업 트리만 허용한다.

B) Git 메타데이터와 관계없이 읽기 가능한 모든 Markdown 디렉터리를 허용한다.

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 4
로컬 Git 작업 트리를 읽을 때 어떤 파일 상태를 기준으로 해야 하나요?

A) 현재 작업 트리의 파일 내용을 읽는다. 아직 커밋하지 않은 변경도 포함한다.

B) 현재 체크아웃된 `HEAD` 커밋의 파일 내용만 읽는다.

X) Other (please describe after [Answer]: tag below)

[Answer]: B
