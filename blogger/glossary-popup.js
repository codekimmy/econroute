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
  window.addEventListener("scroll", closeTip, { passive: true });
  document.addEventListener("DOMContentLoaded", function () {
    fetch(WES_GLOSSARY_URL).then(function (r) { return r.json(); }).then(run).catch(function () {});
  });
})();
