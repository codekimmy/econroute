"""공통 유틸: 환경변수, HTTP, 시계열 저장."""
import csv
import json
import os
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
RAW = DATA / "raw"
CONFIG = ROOT / "config" / "indicators.json"
RULE_VERSION = "1.0"


def load_env():
    """프로젝트 폴더의 .env 파일을 읽어 환경변수로 등록 (이미 있으면 유지)."""
    p = ROOT / ".env"
    if not p.exists():
        return
    for line in p.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def http_json(url, timeout=30):
    req = urllib.request.Request(url, headers={"User-Agent": "EconRoute/0.1"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8"))


def load_config():
    return json.loads(CONFIG.read_text(encoding="utf-8"))


def read_series(sid):
    """data/raw/<id>.csv → [(YYYY-MM-DD, float)] 날짜 오름차순."""
    p = RAW / f"{sid}.csv"
    if not p.exists():
        return []
    with p.open(encoding="utf-8", newline="") as f:
        return [(r["date"], float(r["value"])) for r in csv.DictReader(f)]


def write_series(sid, rows):
    RAW.mkdir(parents=True, exist_ok=True)
    rows = sorted(rows)
    with (RAW / f"{sid}.csv").open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["date", "value"])
        for d, v in rows:
            w.writerow([d, repr(v)])


def write_json(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


def append_csv(path, header, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    new = not path.exists()
    with path.open("a", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        if new:
            w.writerow(header)
        w.writerows(rows)


def read_csv_dicts(path):
    if not path.exists():
        return []
    with path.open(encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))
