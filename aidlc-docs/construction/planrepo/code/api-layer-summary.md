# API 계층 구현

src/server/http/schemas.ts는 입력 스키마, routes.ts는 여섯 API의 서비스 호출을 정의한다. app.ts는 Fastify·SQLite·서비스·정적 UI를 조립하며 listen과 분리했다. main.ts가 로컬 listen과 신호 종료를 담당한다.

허용 Host/Origin, JSON POST, 추가 속성·타입 검사와 안전한 오류 변환은 서비스 호출 전에 적용된다. 종료는 요청 처리가 끝난 후 SQLite를 닫는다. 세부 계약은 [API 안내](api.md)를 참조한다.

타입 검사·빌드와 Fastify inject 스모크로 검증한다. 별도 광범위 API 단위 테스트는 N/A다.
