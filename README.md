# 🎯 Overwatch 2 Stats Dashboard

A clean, local-first dashboard for tracking Overwatch 2 hero performance—powered by real data from Blizzard's official stats page.

## What it does 📊

Ever wonder which heroes are actually dominating the meta? This scrapes **100% real** Overwatch 2 statistics directly from Blizzard's website and displays them in a beautiful, interactive dashboard.

- 🔥 **Real-time data** — No mock numbers, no hallucinations—just pure Blizzard stats
- 📈 **Smart visualizations** — Clean heatmap grid with sortable columns and search
- 🎮 **All the filters** — Mode, tier, region, platform—you name it
- 🖼️ **Official hero portraits** — Real Blizzard artwork, not generic icons
- 📱 **Responsive design** — Works great on desktop and mobile

## How it works ⚡

1. **Scraper** hits Blizzard's API every day (or whenever you run it)
2. **Backend** serves up the data via a clean REST API  
3. **Frontend** displays everything in a gorgeous, interactive interface

The magic? It compares data over time—so you can see which heroes are climbing the meta and which ones are falling off.

## Quick start 🚀

```bash
# Install everything
npm run install-all

# Start the backend
npm run dev:backend

# Start the frontend (in another terminal)
npm run dev:frontend
```

Visit `http://localhost:4321` and you're good to go!

## Features I'm proud of ✨

- **Heatmap Grid** — My favorite! Sortable, searchable, with real hero portraits
- **Metric Toggle** — Switch between pick rate and win rate instantly  
- **Role Filtering** — Focus on Tanks, Damage, or Support heroes
- **Smart Pagination** — Handles all 50 heroes without overwhelming you
- **Change Tracking** — Shows who's rising and falling in the meta

## Tech stuff 🛠️

- **Frontend**: Astro + React + TailwindCSS (no bloated frameworks)
- **Backend**: Node.js + Express (simple, fast)
- **Data**: Real Blizzard API calls via Puppeteer
- **Storage**: Local JSON files (no complex database needed)

## Why I built this 🎮

I was tired of seeing fake Overwatch stats everywhere. Every site had "mock data" or numbers that didn't match reality. So I built something that pulls directly from the source—Blizzard's own API.

Now I can see exactly what's happening in the meta, track trends over time, and make better hero choices.

---

*Built with ❤️ for Overwatch players who care about real data*
