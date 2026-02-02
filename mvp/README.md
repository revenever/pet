# Vacation Calendar MVP

## What it does
- Takes a CSV table of employee vacation dates
- Renders a color-highlighted calendar in the browser
- Lets you export the calendar as a PNG image
- No data is stored; everything runs locally

## CSV format
```
employee,start_date,end_date
Иван,2026-02-10,2026-02-20
Анна,2026-02-15,2026-02-28
```

- `start_date` / `end_date`: `YYYY-MM-DD`
- Colors are assigned automatically

## Run locally
Open `index.html` in a browser.

Optional: use a local server to avoid browser file restrictions.
```
python -m http.server 8000
```
Then open `http://localhost:8000` and navigate to `mvp/`.

## Export
Click `Сохранить PNG` to download the current calendar as an image.
