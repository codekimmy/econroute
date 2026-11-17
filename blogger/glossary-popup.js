/* 경제 내비 (ECON ROUTE) — 용어 팝업
   본문(.post-body)에서 사전에 있는 용어의 '첫 등장'에만 점선 밑줄을 달고,
   PC는 마우스를 올리면, 모바일은 누르면 풀이가 뜹니다.
   WES_GLOSSARY_URL 을 GitHub Pages 주소로 바꾸세요. */
(function () {
  var WES_GLOSSARY_URL = "https://codekimmy.github.io/econroute/blogger/glossary.json";
  var SKIP = { A: 1, SCRIPT: 1, STYLE: 1, CODE: 1, PRE: 1, H1: 1, H2: 1, BUTTON: 1 };
  var tip = null, current = null;

  function closeTip() { if (tip) { tip.remove(); tip = null; current = null; } }

  function openTip(el, item) {
    if (current === el) { closeTip(); return; }
    closeTip();
    tip = document.createElement("div");
    tip.className = "wes-tip";
    tip.setAttribute("role", "tooltip");
    var t = document.createElement("div"); t.className = "wes-tip-term"; t.textContent = item.term;
    var d = document.createElement("div"); d.textContent = item.short;
    tip.appendChild(t); tip.appendChild(d);
    if (item.example) {
      var e = document.createElement("div"); e.className = "wes-tip-ex"; e.textContent = "예) " + item.example;
      tip.appendChild(e);
    }
    if (item.url) {
      var a = document.createElement("a"); a.href = item.url; a.textContent = "더 보기 →";
      tip.appendChild(a);
    }
    document.body.appendChild(tip);
    var r = el.getBoundingClientRect();
    var left = Math.min(window.scrollX + r.left, window.scrollX + document.documentElement.clientWidth - tip.offsetWidth - 12);
    tip.style.left = Math.max(window.scrollX + 12, left) + "px";
    tip.style.top = (window.scrollY + r.bottom + 8) + "px";
    current = el;
  }

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  function wrapFirst(root, item) {
    var re = new RegExp(escapeRe(item.term));
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        for (var p = n.parentNode; p && p !== root; p = p.parentNode) {
          if (SKIP[p.nodeName] || (p.classList && p.classList.contains("wes-term"))) return NodeFilter.FILTER_REJECT;
        }
        return re.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    });
    var node = walker.nextNode();
    if (!node) return;
    var m = re.exec(node.nodeValue);
    var after = node.splitText(m.index);
    after.nodeValue = after.nodeValue.slice(item.term.length);
    var span = document.createElement("span");
    span.className = "wes-term"; span.tabIndex = 0; span.textContent = item.term;
    node.parentNode.insertBefore(span, after);
    span.addEventListener("click", function (ev) { ev.stopPropagation(); openTip(span, item); });
    span.addEventListener("mouseenter", function () { if (window.matchMedia("(hover: hover)").matches) openTip(span, item); });
    span.addEventListener("mouseleave", function () { if (window.matchMedia("(hover: hover)").matches) closeTip(); });
    span.addEventListener("keydown", function (ev) { if (ev.key === "Enter") openTip(span, item); });
  }

  function run(list) {
    list.sort(function (a, b) { return b.term.length - a.term.length; }); // 긴 용어 먼저 (예: '장단기 금리차 역전' > '금리')
    document.querySelectorAll(".post-body").forEach(function (body) {
      list.forEach(function (item) { wrapFirst(body, item); });
    });
  }

  document.addEventListener("click", closeTip);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeTip(); });

  // section headings: color the icon by role (빨강/노랑/초록 신호, 우회 경로, 반대로 보는 시각, 지나온 길, 전방 주의)
  var ROLES = [["빨강", "red"], ["노랑", "yellow"], ["초록", "green"], ["우회", "detour"], ["반대", "opposite"], ["지나온", "past"], ["전방", "caution"]];
  var LEGEND = [["fact", "확인된 사실"], ["likely", "가능성 높음"], ["maybe", "가늠 어려움"]];
  function legendFor(classes) {
    var box = document.createElement("div"); box.className = "wes-route-legend";
    LEGEND.forEach(function (l) {
      if (classes.indexOf(l[0]) < 0) return;
      var s = document.createElement("span"); s.className = l[0];
      s.appendChild(document.createElement("i")); s.appendChild(document.createTextNode(l[1]));
      box.appendChild(s);
    });
    return box;
  }
  function addLegends() {
    document.querySelectorAll(".post-body .wes-chain").forEach(function (ol) {
      if (ol.nextElementSibling && ol.nextElementSibling.className === "wes-route-legend") return;
      var used = [].map.call(ol.querySelectorAll("li"), function (li) { return li.className; });
      if (!used.some(function (c) { return /fact|likely|maybe/.test(c); })) return;
      ol.parentNode.insertBefore(legendFor(used.join(" ")), ol.nextSibling);
    });
  }
  function tagHeadings() {
    document.querySelectorAll(".post-body h2").forEach(function (h) {
      var t = (h.textContent || "").replace(/^\s+/, "");
      for (var i = 0; i < ROLES.length; i++) {
        if (t.indexOf(ROLES[i][0]) === 0) { h.classList.add("wes-h-" + ROLES[i][1]); break; }
      }
    });
  }
  // reading depth tabs: 10초 (signal box) / 1분 (first section) / 10분 심층 (우회·반대·지나온 길)
  // a post can set its own targets with id="wes-1m" and id="wes-10m" on any element
  function addDepthTabs() {
    document.querySelectorAll(".post-body").forEach(function (body) {
      var sig = body.querySelector(".wes-signal");
      if (!sig || body.querySelector(".wes-depth")) return;
      var hs = [].slice.call(body.querySelectorAll("h2"));
      var one = body.querySelector("#wes-1m") || hs[0];
      var deep = body.querySelector("#wes-10m") || hs.filter(function (h) { return /^(우회|반대|지나온)/.test((h.textContent || "").trim()); })[0];
      var targets = [["10초", sig], ["1분", one], ["10분 심층", deep]].filter(function (t) { return t[1]; });
      if (targets.length < 2) return;
      var nav = document.createElement("nav"); nav.className = "wes-depth"; nav.setAttribute("aria-label", "읽는 깊이");
      var links = targets.map(function (t, i) {
        var a = document.createElement("a"); a.href = "#"; a.textContent = t[0];
        if (i === 0) a.className = "on";
        a.addEventListener("click", function (ev) {
          ev.preventDefault();
          var y = t[1].getBoundingClientRect().top + window.pageYOffset - nav.offsetHeight - 16;
          window.scrollTo({ top: y, behavior: "smooth" });
        });
        nav.appendChild(a);
        return a;
      });
      sig.parentNode.insertBefore(nav, sig);
      function mark() {
        var line = nav.getBoundingClientRect().bottom + 40, idx = 0;
        targets.forEach(function (t, i) { if (t[1].getBoundingClientRect().top <= line) idx = i; });
        links.forEach(function (a, i) { a.className = i === idx ? "on" : ""; });
      }
      window.addEventListener("scroll", mark, { passive: true });
    });
  }
  function decorate() { tagHeadings(); addLegends(); addDepthTabs(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", decorate); else decorate();
  window.addEventListener("scroll", closeTip, { passive: true });
  document.addEventListener("DOMContentLoaded", function () {
    fetch(WES_GLOSSARY_URL).then(function (r) { return r.json(); }).then(run).catch(function () {});
  });
})();
