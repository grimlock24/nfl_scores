let scoreChart;
let binomialChart;

const formatPct = value => `${(Number(value) * 100).toFixed(1)}%`;
const cell = (value, tag = "td") => `<${tag}>${value ?? ""}</${tag}>`;
const championKeys = new Set();
const isChampion = player => championKeys.has(String(player).toLowerCase());
const playerLabel = player => isChampion(player)
  ? `<span class="player-label"><img class="player-icon" src="NWO%20belt.png" alt="Prior champion">${player}</span>`
  : player;
const historicalPlayerLabel = (player, row) => row.Champion ? playerLabel(player) : player;
const playerText = player => isChampion(player) ? `${player} ★` : player;
const divisionOrder = [
  "AFC East", "AFC North", "AFC South", "AFC West",
  "NFC East", "NFC North", "NFC South", "NFC West"
];

function renderTable(element, columns, rows) {
  element.innerHTML = `<thead><tr>${columns.map(c => cell(c.label, "th")).join("")}</tr></thead><tbody>${
    rows.map(row => `<tr>${columns.map(c => cell(c.format ? c.format(row[c.key], row) : row[c.key])).join("")}</tr>`).join("")
  }</tbody>`;
}

function render(data) {
  const scores = data.playerScores || [];
  (data.priorChampions || []).forEach(player => championKeys.add(String(player).toLowerCase()));
  document.title = data.title;
  document.getElementById("title").textContent = data.title;
  document.getElementById("updated").textContent = `Last updated: ${data.updated}`;
  document.getElementById("week-label").textContent = data.currentWeek || "Season";
  document.getElementById("possible-points-note").textContent = data.possiblePointsAvailable
    ? "Starting max: the most points a player could have scored with all 272 games unplayed. Still possible max: points already earned plus the best case from games left. Still available: points left to earn. Conflicting picks in one game count once. A player is eliminated only if they can no longer tie the leader."
    : `Maximum points and elimination status are unavailable until the full 2026 schedule is saved (currently ${data.scheduleGameCount || 0} of 272 games). Run the full ESPN refresh to load it.`;

  renderTable(document.getElementById("leaderboard-table"), [
    { key: "Rank", label: "#", format: (_, row) => scores.indexOf(row) + 1 },
    { key: "Player", label: "Player", format: value => playerLabel(value) },
    { key: "Points", label: "Points" },
    { key: "Correct", label: "Correct" },
    { key: "Graded", label: "Graded" },
    { key: "Accuracy", label: "Accuracy", format: formatPct },
    { key: "PointsBack", label: "Back" },
    { key: "StartingMax", label: "Starting max", format: value => value == null ? "—" : value },
    { key: "MaxPossible", label: "Still possible max", format: value => value == null ? "—" : value },
    { key: "PointsRemaining", label: "Still available", format: value => value == null ? "—" : value },
    { key: "Status", label: "Status" }
  ], scores);

  const playerOfWeek = data.playerOfWeek || {};
  const playersOfWeek = playerOfWeek.players || [];
  document.getElementById("player-of-week").innerHTML = `
    <div class="section-heading"><div><p class="eyebrow">WEEKLY HONOR</p><h2>Player of the week</h2></div><span class="trophy">🏆</span></div>
    <div class="award">
      <strong>${playersOfWeek.length ? playersOfWeek.map(playerLabel).join(" & ") : "No completed games yet"}</strong>
      ${playersOfWeek.length ? `<span>${playerOfWeek.points} points in ${playerOfWeek.week}</span>` : ""}
    </div>`;

  const standings = [...(data.standings || [])].sort((a, b) => {
    const divisionDifference = divisionOrder.indexOf(a.Division) - divisionOrder.indexOf(b.Division);
    if (divisionDifference) return divisionDifference;
    return String(a.Team).localeCompare(String(b.Team));
  });
  const columns = [
    { key: "Team", label: "Team" }, { key: "Division", label: "Division" }, { key: "W", label: "W" }, { key: "L", label: "L" },
    { key: "T", label: "T" }, { key: "PCT", label: "PCT", format: formatPct },
    { key: "PF", label: "PF" }, { key: "PA", label: "PA" }, { key: "STRK", label: "STRK" }
  ];
  renderTable(document.getElementById("standings-table"), columns, standings);
  renderTable(document.getElementById("draft-table"), [
    { key: "Round", label: "Round" }, { key: "Pick", label: "Pick" }, { key: "Player", label: "Player", format: value => playerLabel(value) },
    { key: "Selection", label: "Selection" }, { key: "Team", label: "Team" }
  ], data.draft || []);
  renderTable(document.getElementById("pick-scores-table"), [
    { key: "Player", label: "Player", format: value => playerLabel(value) }, { key: "Round", label: "Round" },
    { key: "Pick", label: "Pick" }, { key: "Team", label: "Team" },
    { key: "Selection", label: "Picked" }, { key: "Points", label: "Points" }
  ], data.pickScores || []);
  const pickScores = data.pickScores || [];
  const playerFilter = document.getElementById("player-filter");
  [...new Set(pickScores.map(row => row.Player))].sort().forEach(player => {
    playerFilter.insertAdjacentHTML("beforeend", `<option value="${player}">${player}</option>`);
  });
  const renderPickScores = () => renderTable(
    document.getElementById("pick-scores-table"),
    [
      { key: "Player", label: "Player", format: value => playerLabel(value) },
      { key: "Round", label: "Round" }, { key: "Pick", label: "Pick" },
      { key: "Team", label: "Team" }, { key: "Selection", label: "Picked" },
      { key: "Points", label: "Points" }
    ],
    playerFilter.value ? pickScores.filter(row => row.Player === playerFilter.value) : pickScores
  );
  playerFilter.onchange = renderPickScores;
  renderPickScores();
  renderTable(document.getElementById("historical-table"), [
    { key: "Season", label: "Season" },
    { key: "Champion", label: "Champion", format: value => playerLabel(value) },
    { key: "Points", label: "Winning points" }
  ], data.historicalSeasons || []);
  document.getElementById("historical-details").innerHTML = (data.historicalSeasons || []).map(season => `
    <div class="history-season">
      <h3>${season.Season} final standings</h3>
      <ol>${season.Standings.map(row => `<li class="${row.Player === season.Champion ? "history-champion" : ""}">
        <span>${row.Player === season.Champion ? "🏆 " : ""}${row.Player}</span><strong>${row.Points}</strong>
      </li>`).join("")}</ol>
    </div>`).join("");

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
    const playerColors = { alexander: "#c7f000", ryan: "#e53935" };
    return { label: playerText(player), data: values, borderWidth: 2, tension: .25, borderColor: playerColors[player.toLowerCase()] || `hsl(${(index * 57) % 360} 60% 45%)`, pointRadius: 2 };
  });
  if (scoreChart) scoreChart.destroy();
  scoreChart = new Chart(document.getElementById("score-chart"), { type: "line", data: { labels, datasets }, options: { responsive: true, plugins: { legend: { position: "bottom" } }, scales: { y: { beginAtZero: true } } } });

  const binomialRows = data.binomialOdds || [];
  const binomialPlayers = [...new Set(binomialRows.map(row => row.Player))].sort();
  const binomialFilter = document.getElementById("binomial-player-filter");
  const previousBinomialPlayer = binomialFilter.value;
  binomialFilter.innerHTML = binomialPlayers.map(player =>
    `<option value="${player}">${player}</option>`
  ).join("");
  if (binomialPlayers.includes(previousBinomialPlayer)) {
    binomialFilter.value = previousBinomialPlayer;
  }
  const renderBinomialChart = () => {
    const selectedPlayer = binomialFilter.value || binomialPlayers[0];
    const playerRows = binomialRows
      .filter(row => row.Player === selectedPlayer)
      .sort((a, b) => a.CorrectPicks - b.CorrectPicks);
    const mostLikelyOutcome = playerRows.reduce(
      (best, row) => !best || row.Probability > best.Probability ? row : best,
      null
    );
    const forecastLabel = data.forecastWeek ? `Week ${data.forecastWeek.replace("week_", "")} forecast: ` : "";
    document.getElementById("binomial-summary").textContent = mostLikelyOutcome
      ? `${forecastLabel}${selectedPlayer}'s most likely result is ${mostLikelyOutcome.CorrectPicks} correct pick${mostLikelyOutcome.CorrectPicks === 1 ? "" : "s"} (${Number(mostLikelyOutcome.Probability).toFixed(1)}%).`
      : "No player pick probabilities were found in the workbook.";
    if (binomialChart) binomialChart.destroy();
    binomialChart = new Chart(document.getElementById("binomial-chart"), {
      type: "bar",
      data: {
        labels: playerRows.map(row => row.CorrectPicks),
        datasets: [{
          label: "Probability",
          data: playerRows.map(row => row.Probability),
          backgroundColor: "#3978c5",
          borderRadius: 5
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: context => `${Number(context.raw).toFixed(1)}% chance` } }
        },
        scales: {
          x: { title: { display: true, text: "Correct picks" }, ticks: { precision: 0 } },
          y: {
            beginAtZero: true,
            suggestedMax: 100,
            title: { display: true, text: "Probability" },
            ticks: { callback: value => `${value}%` }
          }
        }
      }
    });
  };
  binomialFilter.onchange = renderBinomialChart;
  renderBinomialChart();

  const reflections = data.playerReflections || [];
  const reflectionWeeks = [...new Set(reflections.map(row => row.Week))];
  const reflectionFilter = document.getElementById("reflection-week-filter");
  const previousReflectionWeek = reflectionFilter.value;
  reflectionFilter.innerHTML = reflectionWeeks.map(week =>
    `<option value="${week}">${week.replace("week_", "Week ")}</option>`
  ).join("");
  reflectionFilter.value = reflectionWeeks.includes(previousReflectionWeek)
    ? previousReflectionWeek
    : reflectionWeeks[reflectionWeeks.length - 1] || "";
  const renderReflections = () => {
    const rows = reflections.filter(row => row.Week === reflectionFilter.value);
    document.getElementById("reflection-note").textContent = rows.length
      ? "Each player's most likely score from the saved pre-game forecast, compared with what they actually scored."
      : "No saved forecasts to compare yet. Forecasts are saved each time the dashboard is generated.";
    renderTable(document.getElementById("reflection-table"), [
      { key: "Player", label: "Player", format: value => playerLabel(value) },
      { key: "LikelyPoints", label: "Predicted", format: (value, row) => `${value} pts (${Number(row.LikelyProbability).toFixed(1)}%)` },
      { key: "ExpectedPoints", label: "Expected avg" },
      { key: "ActualPoints", label: "Actual", format: (value, row) => `${value} pts (${Number(row.ActualProbability).toFixed(1)}% chance)` },
      { key: "Result", label: "Result" }
    ], rows);
  };
  reflectionFilter.onchange = renderReflections;
  renderReflections();

  const matchupRows = (data.weeklyOdds || []).map(row => {
    const teamProbability = Number(row.WinProbability);
    const opponentProbability = Number(row.OpponentProbability);
    const teamIsFavorite = teamProbability >= opponentProbability;
    return {
      GameTime: row.GameTime,
      Favorite: teamIsFavorite ? row.Team : row.Opponent,
      Opponent: teamIsFavorite ? row.Opponent : row.Team,
      FavoriteProbability: Math.max(teamProbability, opponentProbability)
    };
  });
  renderTable(document.getElementById("weekly-odds-table"), [
    { key: "GameTime", label: "Game time" },
    { key: "Favorite", label: "Most likely winner" },
    { key: "Opponent", label: "Opponent" },
    { key: "FavoriteProbability", label: "Win probability", format: value => `${Number(value).toFixed(1)}%` }
  ], matchupRows);
  document.getElementById("weekly-odds-note").textContent = data.weeklyOdds?.length
    ? `${data.forecastWeek ? `Week ${data.forecastWeek.replace("week_", "")}: ` : ""}${data.weeklyOdds.length} matchups from the workbook's Weekly Odds sheet.`
    : "No upcoming team odds were found in the workbook.";
  renderTable(document.getElementById("odds-performance-table"), [
    { key: "GameTime", label: "Game time" },
    { key: "Team", label: "Team" },
    { key: "Opponent", label: "Opponent" },
    { key: "WinProbability", label: "Win chance", format: value => `${Number(value).toFixed(1)}%` },
    { key: "Actual", label: "Actual" },
    { key: "Assessment", label: "Vs odds" }
  ], data.oddsPerformance || []);
  document.getElementById("odds-performance-note").textContent = data.oddsPerformance?.length
    ? "Completed games are compared with saved pregame win probabilities."
    : "No completed games with saved odds and game dates yet. Run the updated scraper, then generate and publish the dashboard before kickoff to preserve forecasts for comparison.";
}

fetch(`data/dashboard.json?updated=${Date.now()}`).then(response => response.json()).then(render).catch(error => {
  document.getElementById("updated").textContent = `Unable to load dashboard data: ${error.message}`;
});
