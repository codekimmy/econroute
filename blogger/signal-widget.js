/* ECON ROUTE - clean home (brand bar + today's signals + latest route + caution + gauges + track record)
   Blogger Layout - Page Body - HTML/JavaScript gadget (leave the gadget title EMPTY):
     div id="wes-signals" + script src=".../blogger/signal-widget.js" */
(function () {
  var WES_DATA_URL = "https://codekimmy.github.io/econroute/data/latest.json";
  var FEED_URL = "/feeds/posts/default?alt=json&max-results=1";
  var SHOW = 3;
  var CLS = { "초록": "green", "노랑": "yellow", "빨강": "red", "보류": "hold" };
  var DAYS = ["일", "월", "화", "수", "목", "금", "토"];
  var LEGEND = [["fact", "확인된 사실"], ["likely", "가능성 높음"], ["maybe", "가늠 어려움"]];

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text; // never interpret data as HTML
    return e;
  }
  function kst(d) { return new Date(d.getTime() + 9 * 3600 * 1000); } // read with getUTC*
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function fmtValue(s) {
    if (s.value == null) return "-";
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
  function md(iso) { var d = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))); return (+iso.slice(5, 7)) + "/" + (+iso.slice(8, 10)) + " (" + DAYS[d.getUTCDay()] + ")"; }
  function korDate(iso) { return (+iso.slice(5, 7)) + "월 " + (+iso.slice(8, 10)) + "일"; }

  // update cadence: how often each number can change (fallback map until latest.json carries it)
  var CADENCE = { daily: "매일", monthly: "매월", meeting: "회의 때" };
  var CAD_FALLBACK = { us_policy_rate: "meeting", kr_base_rate: "meeting", us_cpi: "monthly", kr_cpi: "monthly", copper: "monthly" };
  var STALE_DAYS = { daily: 5, monthly: 100, meeting: 100000 };
  // what arrives at the destination, by direction of the move (fallback until latest.json carries it)
  var EFFECT = { us_policy_rate: ["상승 압력", "하락 여지"], us_10y: ["상승 압력", "하락 여지"], us_cpi: ["부담 증가", "부담 완화"],
    kr_base_rate: ["이자 증가", "이자 감소"], kr_cpi: ["부담 증가", "부담 완화"], usdkrw: ["비용 증가", "비용 감소"],
    kospi: ["평가액 증가", "평가액 감소"], sp500: ["평가액 증가", "평가액 감소"], wti: ["상승 압력", "하락 여지"],
    copper: ["상승 압력", "하락 여지"], btc: ["평가액 증가", "평가액 감소"] };
  function effectOf(s) {
    var c = Number(s.change || 0); if (!c) return "";
    var e = EFFECT[s.id] || ["", ""];
    return c > 0 ? (s.effect_up || e[0]) : (s.effect_down || e[1]);
  }
  function cadenceOf(s) { return s.cadence || CAD_FALLBACK[s.id] || "daily"; }
  function ageDays(s, now) { return s.date ? Math.round(todayNum(now) - dayNum(s.date)) : 0; }
  function freshChips(s, now) {
    var cad = cadenceOf(s), box = el("span", "wes-fresh");
    var chip = el("span", "wes-cad " + cad, CADENCE[cad]);
    if (s.cadence_note) chip.title = s.cadence_note;
    box.appendChild(chip);
    if (ageDays(s, now) > STALE_DAYS[cad]) box.appendChild(el("span", "wes-cad stale", "지연"));
    box.appendChild(el("span", "wes-asof", !s.date ? "-" : cad === "monthly" ? (+s.date.slice(5, 7)) + "월분" : (+s.date.slice(5, 7)) + "/" + (+s.date.slice(8, 10)) + " 기준"));
    return box;
  }

  function lights(color) {
    var l = el("span", "wes-tl " + color); l.setAttribute("aria-hidden", "true");
    l.appendChild(el("i")); l.appendChild(el("i")); l.appendChild(el("i"));
    return l;
  }
  function legendFor(classes) {
    var box = el("div", "wes-route-legend");
    LEGEND.forEach(function (l) {
      if (classes.indexOf(l[0]) < 0) return;
      var s = el("span", l[0]); s.appendChild(el("i")); s.appendChild(document.createTextNode(l[1]));
      box.appendChild(s);
    });
    return box;
  }
  function card(title, extra) { var c = el("section", "wes-box" + (extra ? " " + extra : "")); if (title) c.appendChild(el("h2", "wes-box-h", title)); return c; }

  var MENU = [["오늘의 신호등", "/search/label/" + encodeURIComponent("오늘의 신호등")], ["경로 안내", "/search/label/" + encodeURIComponent("경로 안내")],
    ["지나온 길", "/search/label/" + encodeURIComponent("지나온 길")], ["운행 기록", "/search/label/" + encodeURIComponent("운행 기록")],
    ["초보 운전", "/p/dictionary.html"], ["계기판", "/#wes-gauges"]];
  var PAGES = [["소개", "/p/about.html"], ["운영 원칙", "/p/principles.html"], ["면책 고지", "/p/disclaimer.html"], ["개인정보처리방침", "/p/privacy.html"], ["문의", "/p/contact.html"]];
  function menuBar() {
    var nav = el("nav", "wes-menu"); nav.setAttribute("aria-label", "메뉴");
    var here = decodeURIComponent(location.pathname);
    MENU.forEach(function (m) {
      var a = el("a", null, m[0]); a.href = m[1];
      var target = decodeURIComponent(m[1].split("#")[0]);
      if (target !== "/" && here === target) a.className = "on";
      nav.appendChild(a);
    });
    return nav;
  }
  function footer() {
    if (document.querySelector(".wes-footer")) return;
    var f = el("footer", "wes-footer");
    var n1 = el("nav", "wes-foot-menu"); n1.setAttribute("aria-label", "메뉴");
    MENU.forEach(function (m) { var a = el("a", null, m[0]); a.href = m[1]; n1.appendChild(a); });
    var n2 = el("nav", "wes-foot-pages"); n2.setAttribute("aria-label", "안내");
    PAGES.forEach(function (m) { var a = el("a", null, m[0]); a.href = m[1]; n2.appendChild(a); });
    f.appendChild(n1); f.appendChild(n2);
    f.appendChild(el("p", null, "정보 제공용이며 특정 투자를 권유하지 않습니다. 숫자는 공개 자료를 자동으로 모아 계산한 것으로, 원 자료의 지연·수정이 있을 수 있습니다."));
    f.appendChild(el("p", "wes-foot-brand", "© 2026 경제 내비 · ECON ROUTE · econroute.blogspot.com"));
    var host = document.querySelector(".page_body .centered") || document.querySelector(".page_body") || document.body;
    host.appendChild(f);
  }

  function iconBtn(cls, label) { var b = el("button", "wes-ibtn " + cls); b.type = "button"; b.setAttribute("aria-label", label); return b; }
  function header(box, data, now) {
    var top = el("div", "wes-top");
    var left = el("div", "wes-top-l");
    if (!isHome()) {
      var back = iconBtn("wes-back", "뒤로 가기");
      back.addEventListener("click", function () { if (history.length > 1 && document.referrer.indexOf(location.host) >= 0) history.back(); else location.href = "/"; });
      left.appendChild(back);
    }
    var brand = el("a", "wes-brand"); brand.href = "/";
    brand.appendChild(el("span", "wes-logo"));
    var bt = el("span", "wes-brand-t"); bt.appendChild(el("b", null, "경제 내비")); bt.appendChild(el("small", null, "ECON ROUTE"));
    brand.appendChild(bt); left.appendChild(brand);
    top.appendChild(left);
    var right = el("div", "wes-top-r");
    var up = (data.upcoming || [])[0];
    if (up) {
      var nx = el("span", "wes-next");
      nx.appendChild(el("small", null, "다음 안내"));
      if (up.where) nx.appendChild(el("span", "wes-where", up.where));
      nx.appendChild(el("b", null, korDate(up.date) + " " + up.name));
      nx.appendChild(el("em", null, dday(up.date, now)));
      right.appendChild(nx);
    }
    var sb = iconBtn("wes-search-btn", "검색");
    right.appendChild(sb);
    top.appendChild(right);
    box.appendChild(top);
    box.appendChild(menuBar());

    var form = el("form", "wes-search"); form.action = "/search"; form.method = "get"; form.setAttribute("role", "search");
    var q = el("input"); q.type = "search"; q.name = "q"; q.placeholder = "지표, 용어, 글 제목 검색"; q.setAttribute("aria-label", "블로그 검색");
    var go = el("button", null, "검색"); go.type = "submit";
    form.appendChild(q); form.appendChild(go);
    box.appendChild(form);
    sb.addEventListener("click", function () {
      var open = form.className.indexOf("open") < 0;
      form.className = "wes-search" + (open ? " open" : "");
      if (open) q.focus();
    });

    var g = kst(new Date(data.generated_at));
    var strip = el("div", "wes-strip");
    strip.appendChild(el("span", null, "세계경제에서 내 지갑까지, 길 안내"));
    strip.appendChild(el("span", "wes-mono", (g.getUTCMonth() + 1) + "/" + g.getUTCDate() + " " + pad(g.getUTCHours()) + ":" + pad(g.getUTCMinutes()) + " 경로 갱신"));
    box.appendChild(strip);
  }

  function signalCard(s) {
    var color = CLS[s.color] || "hold";
    var c = el("div", "wes-card " + color);
    var top = el("div", "wes-card-top");
    top.appendChild(lights(color));
    top.appendChild(el("span", "wes-card-word", s.color));
    top.appendChild(el("span", "wes-card-name", s.name));
    c.appendChild(top);
    var num = el("div", "wes-card-num");
    num.appendChild(el("b", null, fmtValue(s)));
    num.appendChild(el("small", null, fmtChange(s)));
    c.appendChild(num);
    c.appendChild(el("div", "wes-card-reason", s.reason || ""));
    if (s.data_note) c.appendChild(el("div", "wes-card-note", "※ " + s.data_note));
    if (s.dest) {
      var d = el("div", "wes-dest");
      d.appendChild(el("span", "wes-pin"));
      var dt = el("span", "wes-dest-t", "도착지: " + s.dest);
      var ef = effectOf(s);
      if (ef) dt.appendChild(el("b", "wes-effect " + (Number(s.change) > 0 ? "up" : "down"), " " + ef));
      d.appendChild(dt);
      d.appendChild(el("span", "wes-mono", s.eta || ""));
      c.appendChild(d);
    }
    c.appendChild(freshChips(s, new Date()));
    return c;
  }

  // latest post: title, lede and its route line (text only, read from the post's own markup)
  function latest(holder) {
    if (!window.fetch || !window.DOMParser) return;
    fetch(FEED_URL).then(function (r) { return r.json(); }).then(function (f) {
      var e = f.feed && f.feed.entry && f.feed.entry[0];
      if (!e) return;
      var link = "/";
      (e.link || []).forEach(function (x) { if (x.rel === "alternate") link = x.href; });
      var total = +((f.feed.openSearch$totalResults || {}).$t || 1);
      var doc = new DOMParser().parseFromString((e.content || e.summary || {}).$t || "", "text/html");
      var box = card("최신 길 안내", "wes-latest");
      var a = el("a", "wes-story"); a.href = link;
      var no = String(total); while (no.length < 3) no = "0" + no;
      a.appendChild(el("span", "wes-pill", "경로 안내 · ROUTE " + no));
      a.appendChild(el("span", "wes-story-h", (e.title.$t || "").split(" — ")[0]));
      var lede = doc.querySelector(".wes-oneline");
      if (lede) a.appendChild(el("span", "wes-story-lede", lede.textContent.replace(/\s+/g, " ").trim()));
      var chain = doc.querySelector(".wes-chain");
      if (chain) {
        var lis = [].slice.call(chain.querySelectorAll("li"));
        var certainty = lis.map(function (li) { var m = /\b(fact|likely|maybe)\b/.exec(li.className); return m ? m[1] : ""; });
        var wheres = [];
        var items = lis.map(function (li) {
          var c = li.cloneNode(true);
          [].forEach.call(c.querySelectorAll(".wes-lag"), function (x) { x.parentNode.removeChild(x); });
          var wh = c.querySelector(".wes-where");
          wheres.push(wh ? wh.textContent.trim() : "");
          if (wh) wh.parentNode.removeChild(wh);
          return c.textContent.replace(/\s+/g, " ").trim().replace(/^(출발|경유|도착)\s*·\s*/, "");
        });
        var route = el("span", "wes-route");
        items.forEach(function (_, i) {
          route.appendChild(el("i", i === items.length - 1 ? "pin" : "n"));
          if (i < items.length - 1) route.appendChild(el("b", certainty[i + 1] || null));
        });
        a.appendChild(route);
        var labels = el("span", "wes-route-l");
        [0, items.length - 1].forEach(function (k, j) {
          var sp = el("span", j ? "wes-route-end" : "wes-route-start");
          sp.appendChild(el("small", null, j ? "도착" : "출발"));
          if (wheres[k]) sp.appendChild(el("span", "wes-where", wheres[k]));
          sp.appendChild(el("span", "wes-route-t", items[k]));
          labels.appendChild(sp);
        });
        a.appendChild(labels);
        if (certainty.join("")) a.appendChild(legendFor(certainty.join(" ")));
      }
      a.appendChild(el("span", "wes-go", "경로 안내 시작 →"));
      box.appendChild(a);
      holder.insertBefore(box, holder.firstChild);
    }).catch(function () {});
  }

  function caution(data, now) {
    var c = card(null, "wes-caution");
    var h = el("h2", "wes-box-h"); h.appendChild(el("span", "wes-warn")); h.appendChild(document.createTextNode("전방 주의 구간"));
    c.appendChild(h);
    var ups = data.upcoming || [];
    if (!ups.length) c.appendChild(el("p", "wes-muted", "예정된 주요 일정이 없습니다."));
    ups.forEach(function (u) {
      var r = el("div", "wes-ev");
      r.appendChild(el("span", "wes-mono", md(u.date)));
      var et = el("span", "wes-ev-t");
      if (u.where) et.appendChild(el("span", "wes-where", u.where));
      et.appendChild(document.createTextNode(u.name));
      r.appendChild(et);
      r.appendChild(el("em", null, dday(u.date, now)));
      c.appendChild(r);
    });
    return c;
  }

  function gauges(data) {
    var c = card("계기판", "wes-gauges"); c.id = "wes-gauges";
    var g = el("div", "wes-grid");
    data.signals.forEach(function (s) {
      var t = el("div", "wes-tick");
      var n = el("span", "wes-tick-n"); n.appendChild(el("i", CLS[s.color] || "hold")); n.appendChild(document.createTextNode(s.name));
      t.appendChild(n);
      t.appendChild(el("span", "wes-tick-v", fmtValue(s)));
      t.appendChild(el("span", "wes-tick-c", fmtChange(s)));
      t.appendChild(freshChips(s, new Date()));
      g.appendChild(t);
    });
    c.appendChild(g);
    var lg = el("div", "wes-cad-legend");
    [["daily", "영업일마다 바뀜 · 미국 자료는 1~3일 늦게 반영"], ["monthly", "한 달에 한 번 발표"], ["meeting", "금리 결정 회의 때만 바뀜"], ["stale", "평소보다 늦게 들어온 자료"]].forEach(function (x) {
      var r = el("span"); r.appendChild(el("span", "wes-cad " + x[0], x[0] === "stale" ? "지연" : CADENCE[x[0]])); r.appendChild(document.createTextNode(x[1])); lg.appendChild(r);
    });
    c.appendChild(lg);
    c.appendChild(el("p", "wes-muted", "매일 아침 6시 30분 자동 갱신. 숫자 옆 날짜는 그 숫자가 언제 자료인지를 뜻합니다. 색은 좋고 나쁨이 아니라 평소와 얼마나 다른 움직임인지를 뜻합니다."));
    return c;
  }

  function track(data) {
    var t = data.track || {};
    var c = card(null, "wes-track");
    c.appendChild(el("span", "wes-track-k", "운행 기록"));
    var big = el("span", "wes-track-big");
    if (t.scored) {
      big.appendChild(el("b", "wes-mono", Math.round(100 * (t.hits || 0) / t.scored) + "%"));
      big.appendChild(el("span", null, "예상대로 도착 (" + t.scored + "건 채점)"));
    } else {
      big.appendChild(el("b", "wes-mono", String(t.registered || 0)));
      big.appendChild(el("span", null, "건 전망 등록 · 채점 대기"));
    }
    c.appendChild(big);
    c.appendChild(el("span", "wes-track-note", (t.next_check ? (t.scored ? "다음" : "첫") + " 채점 " + korDate(t.next_check) + ". " : "") +
      "빗나간 안내는 왜 경로를 다시 찾았는지까지 공개합니다."));
    return c;
  }

  function paidBox(paid) {
    var d = el("details", "wes-box wes-paid");
    d.appendChild(el("summary", null, "유료라 쓰지 않은 자료 " + paid.length + "건 — 이 신호등의 한계와 더 정확해지는 방법"));
    var ul = el("ul");
    paid.forEach(function (p) {
      var li = el("li");
      li.appendChild(el("b", null, p.name));
      li.appendChild(el("span", null, " · 대신: " + p.substitute + " · 영향: " + p.impact));
      if (p.better_source) li.appendChild(el("span", "wes-paid-up", "더 정확해지려면: " + p.better_source + " → " + p.gain));
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
    var now = new Date(), k = kst(now);
    box.innerHTML = "";
    header(box, data, now);
    footer();
    if (!isHome()) { box.className += " wes-compact"; return; } // post and static pages: brand bar only

    var head = el("div", "wes-sec");
    head.appendChild(el("h2", null, "오늘의 신호등"));
    head.appendChild(el("p", null, (k.getUTCMonth() + 1) + "월 " + k.getUTCDate() + "일 (" + DAYS[k.getUTCDay()] + ") · 색은 좋고 나쁨이 아니라, 평소와 얼마나 다른 움직임인지를 뜻합니다."));
    box.appendChild(head);
    var wrap = el("div", "wes-cards");
    data.signals.slice(0, SHOW).forEach(function (s) { wrap.appendChild(signalCard(s)); });
    box.appendChild(wrap);

    var cols = el("div", "wes-cols");
    var left = el("div", "wes-col"), right = el("div", "wes-col");
    left.appendChild(gauges(data));
    right.appendChild(caution(data, now));
    right.appendChild(track(data));
    if ((data.paid_not_used || []).length) right.appendChild(paidBox(data.paid_not_used));
    cols.appendChild(left); cols.appendChild(right);
    box.appendChild(cols);
    latest(left);
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
