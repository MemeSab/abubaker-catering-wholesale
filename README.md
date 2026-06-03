# AbuBaker Catering Wholesale - Inventory OS

A premium, bespoke inventory management system designed for tracking importing operations from China and Turkey. 

## Key Features

- **Real-Time Exchange Rates**: Live integration with foreign currency rates (CNY for China and TRY for Turkey) from a currency API, with manual override toggles (ideal for locking in forward-purchased contract rates).
- **Landed Cost Calculator**: Detailed, automated apportionment of shipping (freight) costs and custom duties per individual item based on packaging dimensions.
- **Logistics & Packaging Tracking**: Calculates individual and total carton volumes (CBM), gross weights, and pieces per carton.
- **Visual Warehouse Location Map**: Grid representing stock distributed in Zone A, B, C, and D of your local warehouse.
- **Import Transit Timeline**: Real-time progress visual tracking cargo coming from China and Turkey via shipping lines/air flights.
- **Client-Side CSV Export**: Instant generation of inventory reports.

## Tech Stack

- **Framework**: Vite + React
- **Icons**: Lucide React
- **Styling**: Custom Slate Dark-Theme Vanilla CSS

## Setup & Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the local development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```
