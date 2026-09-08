# 업무 로직 구현

C2는 src/server/planrepo-service.ts에서 연결·확정 순서를 관리하고 활성 SnapshotId를 검증한다. C3는 github-source.ts에서 고정 GitHub API GET으로 기본 브랜치의 문서를 읽는다. C4는 markdown/question-parser.ts, C5는 renderer.ts, C7은 exporter.ts다. 키와 비교 튜플은 domain/identity.ts에서 관리한다.

유일한 질문 내용이 일치하는 결정만 재사용한다. 비어 있지 않은 원문 답변이 우선하며 충돌·미연결 결정은 경고한다. 원문은 메모리 Buffer로 보유하고 표시 HTML과 분리한다. 내보내기는 호환 확정 답변만 역순 바이트 삽입한다.

US-01~US-05와 BR-01~BR-12를 담당한다. 계층별 대규모 단위 테스트는 승인된 스모크 한정에 따라 N/A다. SM-02~SM-04의 실행 결과는 [구현 요약](implementation-summary.md)에 기록한다.
