let scoreChart;

const formatPct = value => `${(Number(value) * 100).toFixed(1)}%`;
const cell = (value, tag = "td") => `<${tag}>${value ?? ""}</${tag}>`;

function renderTable(element, columns, rows) {
  element.innerHTML = `<thead><tr>${columns.map(c => cell(c.label, "th")).join("")}</tr></thead><tbody>${
    rows.map(row => `<tr>${columns.map(c => cell(c.format ? c.format(row[c.key], row) : row[c.key])).join("")}</tr>`).join("")
  }</tbody>`;
}

function render(data) {
  const scores = data.playerScores || [];
  document.title = data.title;
  document.getElementById("title").textContent = data.title;
  document.getElementById("updated").textContent = `Last updated: ${data.updated}`;
  document.getElementById("week-label").textContent = data.currentWeek || "Season";

  renderTable(document.getElementById("leaderboard-table"), [
    { key: "Rank", label: "#", format: (_, row) => scores.indexOf(row) + 1 },
    { key: "Player", label: "Player" },
    { key: "Points", label: "Points" },
    { key: "Correct", label: "Correct" },
    { key: "Graded", label: "Graded" },
    { key: "Accuracy", label: "Accuracy", format: formatPct },
    { key: "PointsBack", label: "Back" }
  ], scores);

  const playerOfWeek = data.playerOfWeek || {};
  const playersOfWeek = playerOfWeek.players || [];
  document.getElementById("player-of-week").innerHTML = `
    <div class="section-heading"><div><p class="eyebrow">WEEKLY HONOR</p><h2>Player of the week</h2></div><span class="trophy">🏆</span></div>
    <div class="award">
      <strong>${playersOfWeek.length ? playersOfWeek.join(" & ") : "No completed games yet"}</strong>
      ${playersOfWeek.length ? `<span>${playerOfWeek.points} points in ${playerOfWeek.week}</span>` : ""}
    </div>`;

  const standings = data.standings || [];
  const columns = [
    { key: "Team", label: "Team" }, { key: "Division", label: "Division" }, { key: "W", label: "W" }, { key: "L", label: "L" },
    { key: "T", label: "T" }, { key: "PCT", label: "PCT", format: formatPct },
    { key: "PF", label: "PF" }, { key: "PA", label: "PA" }, { key: "STRK", label: "STRK" }
  ];
  renderTable(document.getElementById("standings-table"), columns, standings);
  renderTable(document.getElementById("draft-table"), [
    { key: "Round", label: "Round" }, { key: "Pick", label: "Pick" }, { key: "Player", label: "Player" },
    { key: "Selection", label: "Selection" }, { key: "Team", label: "Team" }
  ], data.draft || []);
  renderTable(document.getElementById("pick-scores-table"), [
    { key: "Player", label: "Player" }, { key: "Round", label: "Round" },
    { key: "Pick", label: "Pick" }, { key: "Team", label: "Team" },
    { key: "Selection", label: "Picked" }, { key: "Points", label: "Points" }
  ], data.pickScores || []);

  const filter = document.getElementById("team-filter");
  filter.oninput = () => {
    const query = filter.value.toLowerCase();
    renderTable(document.getElementById("standings-table"), columns, standings.filter(row => row.Team.toLowerCase().includes(query)));
  };

  const weeks = data.weeklyScores || {};
  const labels = Object.keys(weeks);
  const players = [...new Set(labels.flatMap(week => Object.keys(weeks[week])))];
  let totals = Object.fromEntries(players.map(player => [player, 0]));
  const datasets = players.map((player, index) => {
    const values = labels.map(week => { totals[player] += Number(weeks[week][player] || 0); return totals[player]; });
    return { label: player, data: values, borderWidth: 2, tension: .25, borderColor: `hsl(${(index * 57) % 360} 60% 45%)`, pointRadius: 2 };
  });
  if (scoreChart) scoreChart.destroy();
  scoreChart = new Chart(document.getElementById("score-chart"), { type: "line", data: { labels, datasets }, options: { responsive: true, plugins: { legend: { position: "bottom" } }, scales: { y: { beginAtZero: true } } } });
}

fetch("data/dashboard.json").then(response => response.json()).then(render).catch(error => {
  document.getElementById("updated").textContent = `Unable to load dashboard data: ${error.message}`;
});
