# Overwatch 2 Statistics Dashboard

A local-first dashboard for tracking Overwatch 2 hero performance metrics sourced directly from Blizzard's official statistics API.

## Overview

This application provides a clean interface for analyzing Overwatch 2 hero statistics across different game modes, regions, tiers, and input types. It maintains a local archive of data snapshots for historical comparison and trend analysis.

## Architecture

- **Frontend**: Astro + React + TailwindCSS
- **Backend**: Node.js + Express
- **Data Source**: Blizzard Overwatch 2 API via Puppeteer
- **Storage**: Local JSON files with snapshot management
- **Visualization**: Custom heatmap grid with sortable columns

## Features

- Interactive heatmap grid with 50+ heroes
- Sortable columns (hero name, role, current metrics, changes)
- Search functionality for hero filtering
- Role-based filtering (Tank, Damage, Support)
- Metric toggle (pick rate / win rate)
- Pagination for optimal performance
- Official Blizzard hero portraits
- Responsive design for desktop and mobile

## Data Sources

Statistics are scraped from Blizzard's official Overwatch 2 statistics page:
- Competitive and Quick Play modes
- All regions (Americas, Europe, Asia)
- All skill tiers (Bronze through Grandmaster)
- PC and Console input types

## Quick Start

```bash
# Install dependencies
npm run install-all

# Start backend server
npm run dev:backend

# Start frontend development server
npm run dev:frontend
```

Access the dashboard at `http://localhost:4321`

## Data Collection

Run the scraper to collect current statistics:

```bash
npm run scrape
```

The scraper fetches all filter combinations and stores them as timestamped snapshots for historical comparison.

## API Endpoints

- `GET /api/snapshots` - List available data snapshots
- `GET /api/compare` - Get comparison data for visualization
- `GET /api/top` - Get top heroes by metric
- `GET /api/health` - System health check

## Project Structure

```
├── frontend/          # Astro + React application
├── backend/           # Express API server
├── scraper/           # Data collection scripts
└── mockups/           # UI prototypes
```

## Configuration

All configuration is handled through environment variables and local files. No external services or databases required.

## Development

The project uses a monorepo structure with shared TypeScript types and utilities. Each workspace can be developed independently.

## License

MIT
