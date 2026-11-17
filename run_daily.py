"""매일 실행: 수집 → 신호 판정 → 장부 기록 → 블로그용 latest.json 생성."""
from datetime import datetime, timezone

from collect import collect_all
from common import DATA, RULE_VERSION, load_config, load_env, read_series, write_json
from signals import due_rechecks, evaluate, record_ledger

ORDER = {"빨강": 0, "노랑": 1, "초록": 2, "보류": 3}


def main():
    load_env()
    cfg = load_config()
    status = collect_all(cfg)
    st = {s["id"]: s for s in status}

    signals = []
    for ind in cfg["indicators"]:
        rows = read_series(ind["id"])
        if not rows:
            continue
        s = evaluate(ind, rows)
        s["data_status"] = st.get(ind["id"], {}).get("status", "")
        if ind.get("note"):
            s["note"] = ind["note"]
        if ind.get("cadence"):
            s["cadence"], s["cadence_note"] = ind["cadence"], ind.get("cadence_note", "")
        if ind.get("dest"):
            s["dest"], s["eta"] = ind["dest"], ind.get("eta", "")
        signals.append(s)
    signals.sort(key=lambda s: (ORDER.get(s["color"], 9), -s.get("percentile", 0)))

    added = record_ledger(signals, cfg, st)
    due = due_rechecks()

    write_json(DATA / "latest.json", {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "rule_version": RULE_VERSION,
        "signals": signals,
        "data_status": status,
        "rechecks_due": [r["signal_id"] for r in due],
        "paid_not_used": cfg.get("paid_not_used", []),
        "track": cfg.get("track", {}),
        "upcoming": sorted([u for u in cfg.get("upcoming", []) if u["date"] >= datetime.now(timezone.utc).date().isoformat()], key=lambda u: u["date"])[:3],
    })

    print(f"\n[신호 규칙 v{RULE_VERSION}] 결과")
    for s in signals:
        print(f"  {s['color']:<3} {s['name']:<16} {s.get('reason', '')}")
    print("\n[데이터 상태]")
    for s in status:
        print(f"  {s['status']:<5} {s['name']:<16} {s.get('last_date', '')} {s.get('message', '')}")
    print("\n[유료라 쓰지 않은 자료 — 독자에게 공개]")
    for p in cfg.get("paid_not_used", []):
        print(f"  {p['name']}: 대신 {p['substitute']} / 더 정확하려면 {p['better_source']}")
    print(f"\n장부 신규 기록 {added}건 · 재확인 기한 도래 {len(due)}건 · 결과: data/latest.json")


if __name__ == "__main__":
    main()
