# 경제 내비 (ECON ROUTE) — 0단계 패키지

블로그: https://econroute.blogspot.com/

핵심 지표 12개를 수집해 신호등(초록·노랑·빨강·보류)을 판정하고, 노랑·빨강 신호를 장부에 기록합니다.
결과(`data/latest.json`)는 Blogger 홈의 '오늘의 신호등' 카드가 읽어 갑니다.

## 직접 해야 할 일 (계정·키 발급)

| 할 일 | 어디서 | 비고 |
| --- | --- | --- |
| Python 3.10 이상 설치 | python.org | 설치 시 "Add python.exe to PATH" 체크 |
| FRED API 키 | fred.stlouisfed.org → My Account → API Keys | 무료, 즉시 |
| 한국은행 ECOS 키 | ecos.bok.or.kr → 개발 가이드 → 인증키 신청 | 무료 |
| 오피넷 키 | opinet.co.kr → 유가정보 API | 무료, 신청 후 발급 |
| Blogger 블로그 개설 | blogger.com | 완료 (econroute.blogspot.com) |
| GitHub 계정 + 저장소 `econroute` | github.com | 자동 실행·신호 데이터 공개용 |

## 내 PC에서 실행

```
cd econroute
copy .env.example .env
notepad .env
python run_daily.py
```

`.env`에 키 3개를 붙여넣고 저장한 뒤 실행하면 됩니다. 처음 실행은 10년치 이력을 받느라 1~2분 걸립니다.
키가 없는 지표는 `키 없음`으로 표시되고 나머지는 정상 진행됩니다.

## 폴더 구조

| 경로 | 내용 |
| --- | --- |
| `config/indicators.json` | 지표 목록·신호 규칙 설정 (지표 추가는 여기서) |
| `collect.py` | FRED·ECOS·오피넷 수집, 수정치 자동 감지 → `data/revisions.csv` |
| `signals.py` | 신호 규칙 v1.0, 신호 장부 `data/ledger.csv` |
| `run_daily.py` | 매일 실행 진입점 |
| `.github/workflows/daily.yml` | GitHub에서 매일 06:30(한국시간) 자동 실행 |
| `docs/blogger-setup.md` | Blogger 초기 설정 순서 |
| `blogger/` | Blogger용 CSS, 신호 카드 위젯, 용어 팝업, 용어 사전, 글 템플릿 |

## 신호 규칙 v1.0

- 색은 '좋다/나쁘다'가 아니라 **평소와 얼마나 다른 움직임인가**
- 최근 변동(일간 지표 5거래일, 월간 지표 1개월)을 지난 10년 같은 길이 변동과 비교
- 상위 5% 이상 빨강, 상위 20% 이상 노랑, 나머지 초록
- 정책금리는 변경 시 노랑, 0.5%p 이상 빨강
- 비교 이력이 부족하면(일간 250개, 월간 36개 미만) 보류

## 알려진 확인 필요 사항

- ECOS 통계코드(722Y001·901Y009·731Y001·802Y001)와 오피넷 응답 형식은 첫 실행 때 확인 필요
- 오피넷은 해외 서버 접속을 막을 수 있음 → GitHub 자동 실행에서 실패하면 PC 실행으로 보완
- 금, 한국 반도체 수출은 `확보 전` 상태로 표시
