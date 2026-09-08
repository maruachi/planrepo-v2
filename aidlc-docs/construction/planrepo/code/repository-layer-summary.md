# 저장 계층 구현

src/server/storage/schema.ts는 비파괴 SQLite 버전 1 초기화, decision-store.ts는 최근 연결과 확정 결정의 조회·저장을 담당한다. schema.ts에 실행 DDL이 있으며 별도 마이그레이션 서비스는 없다.

최근 연결은 singleton 한 행이고 결정은 저장소·문서 경로·identityVersion·identityDigest로 유일하다. 확정은 한 동기 트랜잭션에서 신규 저장과 기존 값 검증을 수행한다. 다른 값 충돌 또는 저장 실패는 전체 롤백하고 같은 문자 재요청은 최초 시각을 반환한다. 알 수 없는 DB 구조는 삭제·재생성하지 않는다.

SM-03은 실제 임시 SQLite 파일, 실패 trigger, 앱 close/reopen으로 원자성·재시작을 확인한다. 임시 테스트 데이터만 정리한다. 실행 결과는 [구현 요약](implementation-summary.md)을 참조한다.
