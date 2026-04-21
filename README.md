# Interior Analyzer

AI-powered interior measurement and design tool for architectural professionals.

## Overview

Interior Analyzer processes room photographs to extract spatial measurements, detect objects, and apply AI-driven design edits. Built as part of the Vitruvi AI tool suite for the AEC (Architecture, Engineering, and Construction) sector.

## Features

- Room analysis — estimated dimensions (L x W x H), floor area, and object detection from a single photo
- Calibration input — optional known measurement anchor for improved accuracy
- Image editing — object removal, object addition, and material/finish swap
- Edit history — stacked edits with undo and restart
- Dimension annotation — AI-drawn architectural dimension lines overlaid on the room photo
- Voice input — speak edit instructions via Web Speech API
- PDF export — structured measurement report

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Google Gemini API (gemini-2.5-flash, gemini-3.1-flash-image-preview)

## Getting Started

1. Clone the repository
2. Install dependencies:
   npm install

3. Create a .env.local file at the project root:
   GEMINI_API_KEY=your_key_here

4. Start the development server:
   npm run dev

5. Open http://localhost:3000

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| GEMINI_API_KEY | Google Gemini API key | Yes |
| ALLOWED_ORIGIN | Allowed CORS origin for production | No |

## Project Structure

src/
  app/
    api/
      analyze/     Room analysis API route
      edit/        Image editing API route
      annotate/    Dimension annotation API route
    page.tsx       Main application page
    layout.tsx     Root layout
  components/
    AppHeader      Navigation header
    AnalysisResults  Analysis output display
    ImageViewer    Photo display with annotation overlay
    EditPanel      Edit controls and history management
  types/           Shared TypeScript types
  utils/           PDF export utility

## Deployment

Deployed on Vercel. Configure environment variables in the Vercel project dashboard before deploying.

API routes use Edge runtime for image processing endpoints to support long-running Gemini requests.
