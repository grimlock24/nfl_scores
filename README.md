# NFL Scores Dashboard

This is a static, mobile-friendly dashboard for the 2026 NFL draft league. It is designed for GitHub Pages, so friends can open the shared URL in a browser without installing Python or Excel.

## Local update

From the project directory, run:

```powershell
python generate_dashboard.py
```

The generator reads:

```text
A:\Scoreboard struggle\NFL game\2026\NFL 2026.xlsx
```

and updates `data/dashboard.json`. The workbook remains local and is not uploaded.

## Updating player scores

1. Run the NFL scraper to add the latest games to the `Season Results` sheet.
2. Run `python generate_dashboard.py` from this folder. Player scores are recalculated from the `Draft` and `Season Results` sheets; scores are not edited manually.
3. Push the changed `data/dashboard.json` file to GitHub. GitHub Pages will publish the updated dashboard.

The dashboard source of truth is the `Draft` and `Season Results` sheets in the main workbook. If you use the separate score-update script, run it first, then regenerate the dashboard.

## GitHub Pages

Push this folder to `grimlock24/nfl_scores`, then enable **Settings → Pages → Deploy from a branch**, selecting the `main` branch and `/ (root)`. The dashboard URL will be:

```text
https://grimlock24.github.io/nfl_scores/
```

Weekly odds intentionally display an “Under construction” card until an odds model is available.
