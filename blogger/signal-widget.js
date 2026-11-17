/* ECON ROUTE - night-drive home dashboard (masthead + today's signals + caution + track record)
   Blogger Layout - Page Body - Add a Gadget - HTML/JavaScript (leave the gadget title EMPTY):
     div id="wes-signals" + script src=".../blogger/signal-widget.js" */
(function () {
  var WES_DATA_URL = "https://codekimmy.github.io/econroute/data/latest.json";
  var SHOW = 3;
  var CLS = { "초록": "green", "노랑": "yellow", "빨강": "red", "보류": "hold" };
  var DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text; // never interpret data as HTML
    return e;
  }
  function kst(d) { return new Date(d.getTime() + 9 * 3600 * 1000); } // read with getUTC*
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function fmtValue(s) {
    if (s.value == null) return "";
    var v = Number(s.value);
    if (s.unit === "%") return v.toFixed(2) + "%";
    var digits = Math.abs(v) >= 1000 ? 1 : 2;
    return v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }
  function fmtChange(s) {
    if (s.change == null) return "";
    var c = Number(s.change);
    if (c === 0) return "변화 없음";
    return (c > 0 ? "+" : "−") + Math.abs(c).toFixed(2) + (s.change_unit || "");
  }
  function dday(iso, now) {
    var a = Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
    var k = kst(now), b = Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate());
    var n = Math.round((a - b) / 864e5);
    return n === 0 ? "D-DAY" : "D-" + n;
  }
  function mmdd(iso) { return iso.slice(5, 7) + "." + iso.slice(8, 10); }

  function masthead(data, now) {
    var m = el("div", "wes-mast");
    var brand = el("a", "wes-brand"); brand.href = "/";
    brand.appendChild(el("span", "wes-logo"));
    var bt = el("span"); bt.appendChild(el("b", null, "경제 내비")); bt.appendChild(el("small", null, "ECON ROUTE"));
    brand.appendChild(bt); m.appendChild(brand);

    var up = (data.upcoming || [])[0];
    var next = el("div", "wes-next");
    next.appendChild(el("span", "wes-turn"));
    var nt = el("span", "wes-next-t");
    nt.appendChild(el("small", null, "다음 안내"));
    nt.appendChild(el("b", null, up ? mmdd(up.date) + " " + up.name : "예정된 주요 일정 없음"));
    next.appendChild(nt);
    if (up) next.appendChild(el("span", "wes-dday", dday(up.date, now)));
    m.appendChild(next);

    var cnt = { "빨강": 0, "노랑": 0, "초록": 0 };
    data.signals.forEach(function (s) { if (cnt[s.color] != null) cnt[s.color]++; });
    var st = el("div", "wes-stat");
    var row = el("div", "wes-cnt");
    [["빨강", "red"], ["노랑", "yellow"], ["초록", "green"]].forEach(function (p) {
      var c = el("span", "wes-cnt-" + p[1]); c.title = p[0] + " 신호";
      c.appendChild(el("i")); c.appendChild(document.createTextNode(String(cnt[p[0]])));
      row.appendChild(c);
    });
    st.appendChild(row);
    var g = kst(new Date(data.generated_at));
    st.appendChild(el("small", null, pad(g.getUTCMonth() + 1) + "." + pad(g.getUTCDate()) + " " + DAYS[g.getUTCDay()] + " " +
      pad(g.getUTCHours()) + ":" + pad(g.getUTCMinutes()) + " 갱신"));
    m.appendChild(st);
    return m;
  }

  function card(s) {
    var c = el("div", "wes-card " + (CLS[s.color] || "hold"));
    var top = el("div", "wes-card-top");
    var lamps = el("span", "wes-lamps"); lamps.setAttribute("aria-hidden", "true");
    lamps.appendChild(el("i")); lamps.appendChild(el("i")); lamps.appendChild(el("i"));
    var titles = el("span", "wes-card-titles");
    titles.appendChild(el("span", "wes-card-word", s.color + " 신호"));
    titles.appendChild(el("span", "wes-card-name", s.name));
    top.appendChild(lamps); top.appendChild(titles);
    c.appendChild(top);
    var num = el("div", "wes-card-num");
    num.appendChild(el("b", null, fmtValue(s)));
    num.appendChild(el("small", null, fmtChange(s)));
    c.appendChild(num);
    c.appendChild(el("div", "wes-card-reason", s.reason || ""));
    if (s.data_note) c.appendChild(el("div", "wes-card-meta", "※ " + s.data_note));
    if (s.dest) {
      var sign = el("div", "wes-sign");
      sign.appendChild(el("span", null, "↗ 도착지 · " + s.dest));
      sign.appendChild(el("b", null, s.eta || ""));
      c.appendChild(sign);
    }
    c.appendChild(el("div", "wes-card-meta", "기준일 " + (s.date || "-") + " · 데이터 " + (s.data_status || "-")));
    return c;
  }

  function sectionTitle(text) {
    var h = el("div", "wes-h"); h.appendChild(el("span", "wes-h-badge")); h.appendChild(el("span", null, text));
    return h;
  }

  function lower(data, now) {
    var row = el("div", "wes-row");
    var ev = el("div", "wes-panel");
    var eh = el("div", "wes-panel-h"); eh.appendChild(el("span", "wes-warn")); eh.appendChild(el("span", null, "전방 주의 구간"));
    ev.appendChild(eh);
    var ups = data.upcoming || [];
    if (!ups.length) ev.appendChild(el("div", "wes-ev-empty", "예정된 주요 일정이 없습니다."));
    ups.forEach(function (u) {
      var r = el("div", "wes-ev");
      r.appendChild(el("b", null, mmdd(u.date)));
      r.appendChild(el("span", null, u.name));
      r.appendChild(el("em", null, dday(u.date, now)));
      ev.appendChild(r);
    });
    row.appendChild(ev);

    var t = data.track || {};
    var tr = el("div", "wes-panel");
    var th = el("div", "wes-panel-h"); th.appendChild(el("span", null, "운행 기록"));
    tr.appendChild(th);
    var odo = el("div", "wes-odo"); odo.setAttribute("aria-hidden", "true");
    var digits = String(t.registered || 0); while (digits.length < 3) digits = "0" + digits;
    digits.split("").forEach(function (d, i) { odo.appendChild(el("span", i === digits.length - 1 ? "on" : null, d)); });
    tr.appendChild(odo);
    var line = "등록 전망 " + (t.registered || 0) + "건";
    if (t.scored) line += " · 채점 " + t.scored + "건 중 " + (t.hits || 0) + "건 적중";
    if (t.next_check) line += " · 다음 채점 " + mmdd(t.next_check);
    tr.appendChild(el("div", "wes-panel-note", line));
    row.appendChild(tr);
    return row;
  }

  function paidBox(paid) {
    var d = el("details", "wes-paid");
    d.appendChild(el("summary", null, "공사 구간 · 유료라 쓰지 않은 자료 " + paid.length + "건"));
    var ul = el("ul");
    paid.forEach(function (p) {
      var li = el("li");
      li.appendChild(el("b", null, p.name));
      li.appendChild(el("span", null, " · 대신: " + p.substitute + " · 영향: " + p.impact));
      if (p.better_source) li.appendChild(el("div", "wes-paid-up", "더 정확해지려면: " + p.better_source + " → " + p.gain));
      ul.appendChild(li);
    });
    d.appendChild(ul);
    return d;
  }

  function render(box, data) {
    var now = new Date();
    box.innerHTML = "";
    box.appendChild(masthead(data, now));
    box.appendChild(el("div", "wes-lane"));
    box.appendChild(sectionTitle("오늘의 신호등"));
    var wrap = el("div", "wes-cards");
    data.signals.slice(0, SHOW).forEach(function (s) { wrap.appendChild(card(s)); });
    box.appendChild(wrap);
    box.appendChild(el("div", "wes-foot", "신호 규칙 v" + data.rule_version +
      " · 색은 좋고 나쁨이 아니라 평소와 얼마나 다른 움직임인지를 뜻합니다."));
    box.appendChild(lower(data, now));
    if ((data.paid_not_used || []).length) box.appendChild(paidBox(data.paid_not_used));
  }

  function start() {
    var box = document.getElementById("wes-signals");
    if (!box) return;
    box.textContent = "오늘의 신호등 불러오는 중…";
    fetch(WES_DATA_URL, { cache: "no-cache" })
      .then(function (r) { return r.json(); })
      .then(function (d) { render(box, d); })
      .catch(function () { box.textContent = "신호등을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요."; });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
