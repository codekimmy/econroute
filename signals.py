"""신호 규칙 v1.0 — 신호등 색 판정과 신호 장부 기록.

색의 뜻: '좋다/나쁘다'가 아니라 '평소와 얼마나 다른 움직임인가'.
  초록 = 평소 범위, 노랑 = 지난 10년 중 상위 20% 크기, 빨강 = 상위 5% 크기
정책금리는 변경 자체가 사건: 변경 시 노랑, 0.5%p 이상이면 빨강.
"""
from datetime import date, timedelta

from common import DATA, RULE_VERSION, append_csv, read_csv_dicts

HISTORY_YEARS = 10
MIN_HISTORY = {"D": 250, "M": 36}
YELLOW, RED = 80.0, 95.0


def _yoy(rows):
    by = dict(rows)
    out = []
    for d, v in rows:
        prev = f"{int(d[:4]) - 1}{d[4:]}"
        if prev in by and by[prev]:
            out.append((d, (v / by[prev] - 1) * 100))
    return out


def _changes(vals, method, w):
    ch = []
    for i in range(w, len(vals)):
        a, b = vals[i - w], vals[i]
        ch.append((b / a - 1) * 100 if method == "pct" else b - a)
    return ch


def evaluate(ind, rows):
    base = {"id": ind["id"], "name": ind["name"], "rule_version": RULE_VERSION}
    notes = []
    if ind["transform"] == "yoy":
        raw_last = rows[-1][0] if rows else None
        rows = _yoy(rows)
        if rows and raw_last and rows[-1][0] < raw_last:
            prev = f"{int(raw_last[:4]) - 1}년 {int(raw_last[5:7])}월"
            notes.append(f"기준이 되는 {prev} 값이 원 자료에 없어 {raw_last[:7]} 전년비를 계산할 수 없습니다. "
                         f"계산 가능한 최근 시점({rows[-1][0][:7]})으로 표시합니다.")
    if notes:
        base["data_note"] = " ".join(notes)
    if len(rows) <= ind["window"]:
        return {**base, "color": "보류", "reason": "데이터 부족으로 판정 보류"}

    dates = [d for d, _ in rows]
    vals = [v for _, v in rows]
    last_d, last_v = dates[-1], vals[-1]
    method, w = ind["method"], ind["window"]
    unit_ch = "%" if method == "pct" else "%p"
    base.update(date=last_d, value=round(last_v, 4), unit="%" if ind["transform"] == "yoy" else ind["unit"])

    if method == "policy":
        ch = vals[-1] - vals[-1 - w]
        color = "초록" if abs(ch) < 1e-9 else ("빨강" if abs(ch) >= 0.5 - 1e-9 else "노랑")
        reason = "최근 변경 없음" if color == "초록" else f"최근 {w}일 사이 {ch:+.2f}%p 변경"
        return {**base, "change": round(ch, 4), "change_unit": "%p", "color": color,
                "direction": "상승" if ch > 0 else ("하락" if ch < 0 else "변화 없음"), "reason": reason}

    # 최근 10년 구간만 분포로 사용
    cutoff = (date.fromisoformat(last_d) - timedelta(days=365 * HISTORY_YEARS)).isoformat()
    start_idx = next((i for i, d in enumerate(dates) if d >= cutoff), 0)
    ch = _changes(vals[start_idx:], method, w)
    if not ch:
        return {**base, "color": "보류", "reason": "데이터 부족으로 판정 보류"}
    cur, hist = ch[-1], [abs(x) for x in ch[:-1]]
    direction = "상승" if cur > 0 else ("하락" if cur < 0 else "변화 없음")
    base.update(change=round(cur, 4), change_unit=unit_ch, direction=direction)

    need = ind.get("min_history", MIN_HISTORY[ind["freq"]])
    if len(hist) < need:
        return {**base, "color": "보류",
                "reason": f"비교할 과거 이력 {len(hist)}개로 부족(필요 {need}개) — 판정 보류"}
    days = (date.fromisoformat(last_d) - date.fromisoformat(dates[start_idx])).days
    span_txt = f"지난 {round(days / 365)}년" if days >= 365 * 1.5 else ("지난 1년" if days >= 300 else f"지난 {max(1, round(days / 30))}개월")

    pct = 100.0 * sum(1 for h in hist if h <= abs(cur)) / len(hist)
    color = "빨강" if pct >= RED else ("노랑" if pct >= YELLOW else "초록")
    span = f"최근 {w}{'거래일' if ind['freq'] == 'D' else '개월'}"
    what = "전년비 상승률 변화" if ind["transform"] == "yoy" else "변동"
    top = 100 - pct
    if color == "초록":
        rank = "평소 범위의 움직임"
    else:
        rank = f"{span_txt} 같은 기간 움직임 중 " + ("상위 1% 미만" if top < 1 else f"상위 {top:.0f}%") + " 크기"
    reason = f"{span} {what} {cur:+.2f}{unit_ch} — {rank}"
    return {**base, "percentile": round(pct, 1), "color": color, "reason": reason, "compared_span": span_txt}


LEDGER = DATA / "ledger.csv"
LEDGER_HEADER = ["signal_id", "issued_on", "indicator", "obs_date", "color", "direction", "change",
                 "change_unit", "rule_version", "recheck_on", "data_status",
                 "forecast", "metric", "threshold", "result", "cause"]


def record_ledger(signals, config, status_by_id, today=None):
    """노랑·빨강 신호를 장부에 추가(같은 관측일 신호는 한 번만). 장부는 추가만 하고 고치지 않는다."""
    today = today or date.today()
    seen = {r["signal_id"] for r in read_csv_dicts(LEDGER)}
    inds = {i["id"]: i for i in config["indicators"]}
    rows = []
    for s in signals:
        if s.get("color") not in ("노랑", "빨강"):
            continue
        sid = f"{s['id']}-{s['date']}"
        if sid in seen:
            continue
        recheck = today + timedelta(days=inds[s["id"]]["recheck_days"])  # 발행일 기준
        rows.append([sid, today.isoformat(), s["id"], s["date"], s["color"], s["direction"], s["change"],
                     s["change_unit"], s["rule_version"], recheck.isoformat(),
                     status_by_id.get(s["id"], {}).get("status", ""),
                     "", "", "", "대기", ""])  # 전망·채점 칸은 분석 글 작성·재확인 단계에서 채움
    if rows:
        append_csv(LEDGER, LEDGER_HEADER, rows)
    return len(rows)


def due_rechecks(today=None):
    today = (today or date.today()).isoformat()
    return [r for r in read_csv_dicts(LEDGER) if r["result"] == "대기" and r["recheck_on"] <= today]
