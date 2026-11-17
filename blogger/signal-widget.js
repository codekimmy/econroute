/* ECON ROUTE - morning-paper home (masthead + today's signals + top route + caution + track record)
   Blogger Layout - Page Body - HTML/JavaScript gadget (leave the gadget title EMPTY):
     div id="wes-signals" + script src=".../blogger/signal-widget.js" */
(function () {
  var WES_DATA_URL = "https://codekimmy.github.io/econroute/data/latest.json";
  var FEED_URL = "/feeds/posts/default?alt=json&max-results=1";
  var SHOW = 3;
  var CLS = { "초록": "green", "노랑": "yellow", "빨강": "red", "보류": "hold" };
  var DAYS = ["일", "월", "화", "수", "목", "금", "토"];

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
  function dayNum(iso) { return Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 864e5; }
  function todayNum(now) { var k = kst(now); return Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()) / 864e5; }
  function dday(iso, now) { var n = Math.round(dayNum(iso) - todayNum(now)); return n === 0 ? "D-DAY" : "D-" + n; }
  function mmdd(iso) { return iso.slice(5, 7) + "." + iso.slice(8, 10); }
  function korDate(iso) { return (+iso.slice(5, 7)) + "월 " + (+iso.slice(8, 10)) + "일"; }

  function lights(color) {
    var l = el("span", "wes-tl " + color); l.setAttribute("aria-hidden", "true");
    l.appendChild(el("i")); l.appendChild(el("i")); l.appendChild(el("i"));
    return l;
  }

  function masthead(box, data, now) {
    var k = kst(now), g = kst(new Date(data.generated_at));
    var top = el("div", "wes-topbar");
    top.appendChild(el("span", null, k.getUTCFullYear() + "년 " + (k.getUTCMonth() + 1) + "월 " + k.getUTCDate() + "일 " + DAYS[k.getUTCDay()] + "요일"));
    top.appendChild(el("span", "wes-tagline", "세계경제에서 내 지갑까지, 길 안내"));
    top.appendChild(el("span", null, pad(g.getUTCHours()) + ":" + pad(g.getUTCMinutes()) + " 경로 갱신"));
    box.appendChild(top);

    var cnt = { "빨강": 0, "노랑": 0, "초록": 0 };
    data.signals.forEach(function (s) { if (cnt[s.color] != null) cnt[s.color]++; });

    var m = el("div", "wes-mast");
    var l = el("div", "wes-mast-l");
    l.appendChild(el("b", null, "오늘의 교통 상황"));
    l.appendChild(el("span", null, "신호 " + data.signals.length + "개 중 " + (cnt["빨강"] + cnt["노랑"]) + "개 점등"));
    l.appendChild(el("span", null, "신호 규칙 v" + data.rule_version));
    var t = el("a", "wes-title"); t.href = "/";
    t.appendChild(el("span", "wes-kicker", "ECON ROUTE"));
    t.appendChild(el("span", "wes-name", "경제 내비"));
    var r = el("div", "wes-mast-r");
    var row = el("div", "wes-cnt");
    [["빨강", "red"], ["노랑", "yellow"], ["초록", "green"]].forEach(function (p) {
      var c = el("span", "wes-cnt-" + p[1]); c.title = p[0] + " 신호";
      c.appendChild(el("i")); c.appendChild(document.createTextNode(String(cnt[p[0]])));
      row.appendChild(c);
    });
    r.appendChild(row);
    r.appendChild(el("small", null, "빨강 · 노랑 · 초록"));
    m.appendChild(l); m.appendChild(t); m.appendChild(r);
    box.appendChild(m);

    var ups = data.upcoming || [];
    var nx = el("div", "wes-next");
    nx.appendChild(el("span", "wes-turn"));
    var txt = el("span", "wes-next-t");
    txt.appendChild(el("small", null, "다음 안내"));
    if (ups.length) {
      txt.appendChild(el("b", null, korDate(ups[0].date) + " " + ups[0].name));
      if (ups[1]) {
        var gap = Math.round(dayNum(ups[1].date) - dayNum(ups[0].date));
        txt.appendChild(el("span", "wes-next-2", " · " + (gap === 1 ? "다음 날 " : korDate(ups[1].date) + " ") + ups[1].name));
      }
    } else txt.appendChild(el("b", null, "예정된 주요 일정 없음"));
    nx.appendChild(txt);
    if (ups.length) nx.appendChild(el("em", null, dday(ups[0].date, now)));
    box.appendChild(nx);
  }

  function card(s) {
    var color = CLS[s.color] || "hold";
    var c = el("div", "wes-card " + color);
    var top = el("div", "wes-card-top");
    top.appendChild(lights(color));
    top.appendChild(el("span", "wes-card-word", s.color + " 신호"));
    c.appendChild(top);
    c.appendChild(el("div", "wes-card-name", s.name));
    var num = el("div", "wes-card-num");
    num.appendChild(el("b", null, fmtValue(s)));
    num.appendChild(el("small", null, fmtChange(s)));
    c.appendChild(num);
    c.appendChild(el("div", "wes-card-reason", s.reason || ""));
    if (s.data_note) c.appendChild(el("div", "wes-card-meta", "※ " + s.data_note));
    if (s.dest) c.appendChild(el("span", "wes-sign", "도착지 · " + s.dest + (s.eta ? " · " + s.eta : "")));
    c.appendChild(el("div", "wes-card-meta", "기준일 " + (s.date || "-") + " · 데이터 " + (s.data_status || "-")));
    return c;
  }

  function section(text, sub) {
    var h = el("div", "wes-sec"); h.appendChild(el("span", "wes-sec-t", text));
    if (sub) h.appendChild(el("span", "wes-sec-s", sub));
    return h;
  }

  // top story: newest post, its route line read from the post's .wes-chain (text only)
  function topStory(holder) {
    if (!window.fetch || !window.DOMParser) return;
    fetch(FEED_URL).then(function (r) { return r.json(); }).then(function (f) {
      var e = f.feed && f.feed.entry && f.feed.entry[0];
      if (!e) return;
      var link = "/";
      (e.link || []).forEach(function (x) { if (x.rel === "alternate") link = x.href; });
      var total = +((f.feed.openSearch$totalResults || {}).$t || 1);
      var doc = new DOMParser().parseFromString((e.content || e.summary || {}).$t || "", "text/html");
      var p = el("a", "wes-story"); p.href = link;
      var no = String(total); while (no.length < 3) no = "0" + no;
      p.appendChild(el("span", "wes-story-k", "ROUTE " + no + " · 경로 안내"));
      p.appendChild(el("span", "wes-story-h", (e.title.$t || "").split(" — ")[0]));
      var chain = doc.querySelector(".wes-chain");
      if (chain) {
        var color = /\b(red|yellow|green)\b/.exec(chain.className); color = color ? color[1] : "ink";
        var items = [].slice.call(chain.querySelectorAll("li")).map(function (li) {
          var c = li.cloneNode(true);
          [].forEach.call(c.querySelectorAll(".wes-lag"), function (x) { x.parentNode.removeChild(x); });
          return c.textContent.replace(/\s+/g, " ").trim().replace(/^(출발|경유|도착)\s*·\s*/, "");
        });
        var route = el("span", "wes-route " + color);
        items.forEach(function (_, i) {
          route.appendChild(el("i", i === items.length - 1 ? "pin" : "n"));
          if (i < items.length - 1) route.appendChild(el("b"));
        });
        p.appendChild(route);
        var labels = el("span", "wes-route-l");
        labels.style.gridTemplateColumns = "repeat(" + items.length + ", minmax(0, 1fr))";
        items.forEach(function (t) { labels.appendChild(el("span", null, t)); });
        p.appendChild(labels);
      }
      var lede = doc.querySelector(".wes-oneline");
      if (lede) p.appendChild(el("span", "wes-story-lede", lede.textContent.replace(/\s+/g, " ").trim()));
      p.appendChild(el("span", "wes-story-go", "경로 안내 시작"));
      holder.appendChild(p);
      holder.parentNode.classList.add("has-story");
    }).catch(function () {});
  }

  function side(data, now) {
    var s = el("div", "wes-side");
    s.appendChild(el("div", "wes-side-h", "전방 주의 구간"));
    var ups = data.upcoming || [];
    if (!ups.length) s.appendChild(el("div", "wes-note", "예정된 주요 일정이 없습니다."));
    ups.forEach(function (u) {
      var r = el("div", "wes-ev");
      r.appendChild(el("b", null, mmdd(u.date)));
      r.appendChild(el("span", null, u.name));
      r.appendChild(el("em", null, dday(u.date, now)));
      s.appendChild(r);
    });
    var t = data.track || {};
    s.appendChild(el("div", "wes-side-h wes-gap", "운행 기록"));
    var odo = el("div", "wes-odo"); odo.setAttribute("aria-hidden", "true");
    var digits = String(t.registered || 0); while (digits.length < 3) digits = "0" + digits;
    digits.split("").forEach(function (d) { odo.appendChild(el("span", null, d)); });
    s.appendChild(odo);
    var line = "등록 전망 " + (t.registered || 0) + "건";
    if (t.scored) line += " · 채점 " + t.scored + "건 중 " + (t.hits || 0) + "건 적중";
    if (t.next_check) line += " · " + (t.scored ? "다음" : "첫") + " 채점 " + korDate(t.next_check);
    s.appendChild(el("div", "wes-note", line));
    return s;
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

  function isHome() {
    var p = location.pathname;
    return !/\.html$/.test(p) && p.indexOf("/search") !== 0 && p.indexOf("/p/") !== 0;
  }

  function render(box, data) {
    var now = new Date();
    box.innerHTML = "";
    masthead(box, data, now);
    if (!isHome()) { box.className += " wes-compact"; return; } // post and static pages: masthead only
    box.appendChild(section("오늘의 신호등", "평소와 얼마나 다른 움직임인가"));
    var wrap = el("div", "wes-cards");
    data.signals.slice(0, SHOW).forEach(function (s) { wrap.appendChild(card(s)); });
    box.appendChild(wrap);
    box.appendChild(el("div", "wes-foot", "색은 좋고 나쁨이 아니라 평소와 얼마나 다른 움직임인지를 뜻합니다."));
    var row = el("div", "wes-row");
    var story = el("div", "wes-story-box");
    row.appendChild(story);
    row.appendChild(side(data, now));
    box.appendChild(row);
    if ((data.paid_not_used || []).length) box.appendChild(paidBox(data.paid_not_used));
    topStory(story);
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
