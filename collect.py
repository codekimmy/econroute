"""지표 수집: FRED, 한국은행 ECOS, 오피넷.

- 처음 실행: 약 11년치 이력 수집
- 이후 실행: 최근 400일을 다시 받아 덮어씀 → 기관의 수정치 발표를 자동 감지해 data/revisions.csv에 기록
"""
import os
import urllib.parse
from datetime import date, datetime, timedelta, timezone

from common import DATA, append_csv, http_json, read_series, write_series

HISTORY_DAYS = 365 * 11
REFRESH_DAYS = 400
OPINET_BASE = os.environ.get("OPINET_BASE", "http://www.opinet.co.kr")


class MissingKey(Exception):
    pass


def _key(name):
    v = os.environ.get(name, "").strip()
    if not v:
        raise MissingKey(name)
    return v


def fetch_fred(params, start):
    q = urllib.parse.urlencode({
        "series_id": params["series"],
        "api_key": _key("FRED_API_KEY"),
        "file_type": "json",
        "observation_start": start.isoformat(),
    })
    d = http_json(f"https://api.stlouisfed.org/fred/series/observations?{q}")
    out = []
    for o in d.get("observations", []):
        if o.get("value") in (".", "", None):
            continue
        out.append((o["date"], float(o["value"])))
    return out


def fetch_ecos(params, start):
    key = _key("ECOS_API_KEY")
    cycle = params["cycle"]
    if cycle == "D":
        s, e = start.strftime("%Y%m%d"), date.today().strftime("%Y%m%d")
    else:
        s, e = start.strftime("%Y%m"), date.today().strftime("%Y%m")
    out, a, size = [], 1, 10000
    while True:
        b = a + size - 1
        url = (f"https://ecos.bok.or.kr/api/StatisticSearch/{key}/json/kr/{a}/{b}/"
               f"{params['stat']}/{cycle}/{s}/{e}/{params['item']}")
        d = http_json(url)
        if "StatisticSearch" not in d:
            res = d.get("RESULT", {})
            if res.get("CODE") == "INFO-200":  # 해당 데이터 없음
                break
            raise RuntimeError(f"ECOS 오류 {res.get('CODE')}: {res.get('MESSAGE')}")
        block = d["StatisticSearch"]
        for r in block.get("row", []):
            t, v = r.get("TIME", ""), r.get("DATA_VALUE", "")
            if not v:
                continue
            ds = f"{t[:4]}-{t[4:6]}-{t[6:8]}" if cycle == "D" else f"{t[:4]}-{t[4:6]}-01"
            out.append((ds, float(v.replace(",", ""))))
        if b >= int(block.get("list_total_count", 0)):
            break
        a = b + 1
    return out


def fetch_opinet(params, start):
    q = urllib.parse.urlencode({"code": _key("OPINET_API_KEY"), "out": "json", "prodcd": params["prodcd"]})
    d = http_json(f"{OPINET_BASE}/api/avgRecentPrice.do?{q}")
    out = []
    for o in d.get("RESULT", {}).get("OIL", []):
        t = o.get("TRADE_DT", "")
        if len(t) == 8 and o.get("PRICE"):
            out.append((f"{t[:4]}-{t[4:6]}-{t[6:8]}", float(o["PRICE"])))
    return out


FETCHERS = {"fred": fetch_fred, "ecos": fetch_ecos, "opinet": fetch_opinet}

# 기준일 대비 마지막 관측이 이보다 오래되면 '지연'
MAX_AGE = {"D": 7, "M": 75}


def collect_one(ind, fetchers=FETCHERS):
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    old = dict(read_series(ind["id"]))
    start = date.today() - timedelta(days=REFRESH_DAYS if old else HISTORY_DAYS)
    status = {"id": ind["id"], "name": ind["name"], "fetched_at": now}
    try:
        new = fetchers[ind["source"]](ind["params"], start)
    except MissingKey as e:
        status.update(status="키 없음", message=f"{e} 미설정")
        new = None
    except Exception as e:  # 네트워크·응답 오류: 기존 데이터 유지
        status.update(status="실패", message=str(e)[:200])
        new = None

    if new:
        revisions = []
        merged = dict(old)
        for d, v in new:
            if d in old and abs(old[d] - v) > 1e-9:
                revisions.append([now, ind["id"], d, old[d], v])
            merged[d] = v
        write_series(ind["id"], merged.items())
        if revisions:
            append_csv(DATA / "revisions.csv",
                       ["detected_at", "indicator", "obs_date", "old_value", "new_value"], revisions)
        status["revisions"] = len(revisions)
    elif new is not None and "status" not in status:
        status.update(status="실패", message="응답에 데이터 없음")

    series = read_series(ind["id"])
    if series:
        last = series[-1][0]
        status["last_date"] = last
        if "status" not in status:
            age = (date.today() - date.fromisoformat(last)).days
            status["status"] = "정상" if age <= ind.get("max_age_days", MAX_AGE[ind["freq"]]) else "지연"
            if status["status"] == "지연":
                status["message"] = f"마지막 관측 {age}일 전"
    return status


def collect_all(config, fetchers=FETCHERS):
    out = [collect_one(ind, fetchers) for ind in config["indicators"]]
    for p in config.get("pending", []):
        out.append({"id": p["id"], "name": p["name"], "status": p["status"], "message": p["reason"]})
    return out
