import json
import os
from collections import defaultdict
from datetime import datetime

import pandas as pd

WORKBOOK = r"A:\Scoreboard struggle\NFL game\2026\NFL 2026.xlsx"
HISTORICAL_WORKBOOK = r"A:\Scoreboard struggle\NFL game\Historical\historical.xlsx"
OUTPUT = os.path.join(os.path.dirname(__file__), "data", "dashboard.json")

DIVISIONS = {
    "Baltimore Ravens": "AFC North", "Cincinnati Bengals": "AFC North",
    "Cleveland Browns": "AFC North", "Pittsburgh Steelers": "AFC North",
    "Buffalo Bills": "AFC East", "Miami Dolphins": "AFC East",
    "New England Patriots": "AFC East", "New York Jets": "AFC East",
    "Houston Texans": "AFC South", "Indianapolis Colts": "AFC South",
    "Jacksonville Jaguars": "AFC South", "Tennessee Titans": "AFC South",
    "Denver Broncos": "AFC West", "Kansas City Chiefs": "AFC West",
    "Las Vegas Raiders": "AFC West", "Los Angeles Chargers": "AFC West",
    "Chicago Bears": "NFC North", "Detroit Lions": "NFC North",
    "Green Bay Packers": "NFC North", "Minnesota Vikings": "NFC North",
    "Dallas Cowboys": "NFC East", "New York Giants": "NFC East",
    "Philadelphia Eagles": "NFC East", "Washington Commanders": "NFC East",
    "Atlanta Falcons": "NFC South", "Carolina Panthers": "NFC South",
    "New Orleans Saints": "NFC South", "Tampa Bay Buccaneers": "NFC South",
    "Arizona Cardinals": "NFC West", "Los Angeles Rams": "NFC West",
    "San Francisco 49ers": "NFC West", "Seattle Seahawks": "NFC West",
}


def sheet_name(sheets, wanted):
    lookup = {name.casefold(): name for name in sheets}
    return lookup[wanted.casefold()]


def historical_summary():
    if not os.path.exists(HISTORICAL_WORKBOOK):
        return [], []

    history = []
    champions = []
    workbook = pd.ExcelFile(HISTORICAL_WORKBOOK)
    for season in workbook.sheet_names:
        sheet = pd.read_excel(HISTORICAL_WORKBOOK, sheet_name=season, header=1)
        columns = {str(column).strip().casefold(): column for column in sheet.columns}
        player_column = columns.get("player")
        points_column = columns.get("points") or columns.get("score")
        if not player_column or not points_column:
            continue
        scores = (
            sheet[[player_column, points_column]]
            .rename(columns={player_column: "Player", points_column: "Points"})
            .dropna(subset=["Player", "Points"])
        )
        scores["Player"] = scores["Player"].replace({"Chrsitian": "Christian"})
        totals = scores.groupby("Player", as_index=False)["Points"].sum()
        totals = totals.sort_values(["Points", "Player"], ascending=[False, True])
        season_champion = totals.iloc[0]["Player"]
        champions.append(season_champion)
        for row in totals.itertuples():
            history.append({
                "Season": str(season),
                "Player": row.Player,
                "Points": int(row.Points),
                "Champion": row.Player == season_champion,
            })
    return history, sorted(set(champions))


def main():
    workbook = pd.ExcelFile(WORKBOOK)
    draft = pd.read_excel(WORKBOOK, sheet_name=sheet_name(workbook.sheet_names, "Draft"))
    results = pd.read_excel(WORKBOOK, sheet_name=sheet_name(workbook.sheet_names, "Season Results"))
    if any(name.casefold() == "standings" for name in workbook.sheet_names):
        standings = pd.read_excel(WORKBOOK, sheet_name=sheet_name(workbook.sheet_names, "Standings"))
    else:
        stats = defaultdict(lambda: {"W": 0, "L": 0, "T": 0, "PF": 0, "PA": 0})
        for _, game in results.iterrows():
            winner, loser = game["Winner"], game["Loser"]
            winner_score, loser_score = int(game["Winner_Score"]), int(game["Loser_Score"])
            if winner_score == loser_score:
                stats[winner]["T"] += 1
                stats[loser]["T"] += 1
            else:
                stats[winner]["W"] += 1
                stats[loser]["L"] += 1
            stats[winner]["PF"] += winner_score
            stats[winner]["PA"] += loser_score
            stats[loser]["PF"] += loser_score
            stats[loser]["PA"] += winner_score
        standings = pd.DataFrame([
            {
                "Team": team,
                **values,
                "PCT": (values["W"] + values["T"] * 0.5) / (values["W"] + values["L"] + values["T"]),
                "STRK": "",
                "Division": DIVISIONS.get(team, ""),
            }
            for team, values in stats.items()
        ])

    draft_columns = [column for column in ["Round", "Pick", "Player", "Selection", "Team"] if column in draft]
    standings = standings.fillna("")
    if "Division" not in standings.columns:
        standings.insert(
            1,
            "Division",
            standings["Team"].map(DIVISIONS).fillna(""),
        )
    results = results.fillna("")
    weekly_scores = {}
    player_totals = {}
    player_correct = {player: 0 for player in draft["Player"].dropna().unique()}
    player_graded = {player: 0 for player in draft["Player"].dropna().unique()}
    pick_scores = {
        (row["Player"], row["Team"], str(row["Selection"]).strip().casefold()): {
            "points": 0,
            "round": row.get("Round", ""),
            "pick": row.get("Pick", ""),
        }
        for _, row in draft.iterrows()
    }
    for _, game in results.iterrows():
        week = str(game["Week"])
        weekly_scores.setdefault(week, {})
        winner = game["Winner"]
        loser = game["Loser"]
        for _, pick in draft.iterrows():
            player = pick["Player"]
            selection = str(pick["Selection"]).strip().casefold()
            if pd.isna(player) or pd.isna(pick["Team"]):
                continue
            weekly_scores[week].setdefault(player, 0)
            is_win_pick = selection == "wins" and pick["Team"] == winner
            is_loss_pick = selection == "losses" and pick["Team"] == loser
            team_played = pick["Team"] in (winner, loser)
            if team_played:
                player_graded[player] += 1
            if is_win_pick or is_loss_pick:
                weekly_scores[week][player] += 1
                pick_scores[(player, pick["Team"], selection)]["points"] += 1
                player_correct[player] += 1
            player_totals[player] = sum(weekly_scores[w].get(player, 0) for w in weekly_scores)

    latest_week = max(weekly_scores, default="")
    latest_week_scores = weekly_scores.get(latest_week, {})
    best_weekly_score = max(latest_week_scores.values(), default=0)
    players_of_week = [
        player for player, points in latest_week_scores.items()
        if points == best_weekly_score
    ]

    leader_points = max(player_totals.values(), default=0)
    player_scores = sorted(
        [
            {
                "Player": player,
                "Points": points,
                "Correct": player_correct.get(player, 0),
                "Graded": player_graded.get(player, 0),
                "Accuracy": (
                    player_correct.get(player, 0) / player_graded[player]
                    if player_graded.get(player, 0) else 0
                ),
                "PointsBack": leader_points - points,
            }
            for player, points in player_totals.items()
        ],
        key=lambda row: (-row["Points"], -row["Accuracy"], row["Player"]),
    )
    player_order = {
        row["Player"]: index
        for index, row in enumerate(player_scores)
    }
    historical, prior_champions = historical_summary()

    payload = {
        "title": "NFL Draft League 2026",
        "updated": datetime.now().strftime("%B %d, %Y at %I:%M %p").replace(" 0", " "),
        "currentWeek": max(weekly_scores, default="No games"),
        "playerOfWeek": {
            "week": latest_week,
            "players": players_of_week,
            "points": best_weekly_score,
        },
        "standings": standings.to_dict("records"),
        "draft": draft[draft_columns].fillna("").to_dict("records"),
        "pickScores": [],
        "playerScores": player_scores,
        "weeklyScores": weekly_scores,
        "historical": historical,
        "priorChampions": prior_champions,
    }
    payload["pickScores"] = [
        {
            "Player": player,
            "Round": values["round"],
            "Pick": values["pick"],
            "Team": team,
            "Selection": selection.title(),
            "Points": values["points"],
        }
        for (player, team, selection), values in sorted(
            pick_scores.items(),
            key=lambda item: (
                player_order.get(item[0][0], len(player_order)),
                item[1]["round"],
                item[1]["pick"],
            ),
        )
    ]
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as file:
        json.dump(payload, file, indent=2)
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
