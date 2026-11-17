/* 경제 내비 (ECON ROUTE) — 홈 '오늘의 신호등' 카드
   Blogger 레이아웃 > 가젯 추가 > HTML/JavaScript 에 아래처럼 넣기:
     <div id="wes-signals"></div>
     <script src="https://codekimmy.github.io/econroute/blogger/signal-widget.js"></script>
   WES_DATA_URL 을 GitHub Pages 주소로 바꾸세요. */
(function () {
  var WES_DATA_URL = "https://codekimmy.github.io/econroute/data/latest.json";
  var SHOW = 3; // 홈에는 신호등 3개만
  var CLS = { "초록": "green", "노랑": "yellow", "빨강": "red", "보류": "hold" };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text; // textContent: 외부 데이터를 HTML로 해석하지 않음
    return e;
  }

  function render(box, data) {
    var wrap = el("div", "wes-cards");
    data.signals.slice(0, SHOW).forEach(function (s) {
      var card = el("div", "wes-card " + (CLS[s.color] || "hold"));
      card.appendChild(el("div", "wes-card-name", s.color + " · " + s.name));
      card.appendChild(el("div", "wes-card-reason", s.reason || ""));
      var meta = "기준일 " + (s.date || "-") + " · 데이터 " + (s.data_status || "-");
      card.appendChild(el("div", "wes-card-meta", meta));
      wrap.appendChild(card);
    });
    box.innerHTML = "";
    box.appendChild(wrap);
    var t = new Date(data.generated_at);
    box.appendChild(el("div", "wes-foot",
      "신호 규칙 v" + data.rule_version + " · 갱신 " + t.toLocaleString("ko-KR") +
      " · 색은 좋고 나쁨이 아니라 '평소와 얼마나 다른 움직임인가'를 뜻합니다."));
    var paid = data.paid_not_used || [];
    if (paid.length) {
      // 유료라 쓰지 않은 자료를 독자에게 항상 공개
      var d = document.createElement("details");
      d.className = "wes-paid";
      d.appendChild(el("summary", null, "유료라 쓰지 않은 자료 " + paid.length + "건 — 이 신호등의 한계와 더 정확해지는 방법"));
      var ul = el("ul");
      paid.forEach(function (p) {
        var li = el("li");
        li.appendChild(el("b", null, p.name));
        li.appendChild(el("span", null, " · 대신: " + p.substitute + " · 영향: " + p.impact));
        if (p.better_source) li.appendChild(el("div", "wes-paid-up", "더 정확해지려면: " + p.better_source + " → " + p.gain));
        ul.appendChild(li);
      });
      d.appendChild(ul);
      box.appendChild(d);
    }
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
