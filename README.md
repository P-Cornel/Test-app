# 🌍 SheetPlotter AI

**SheetPlotter AI** is an intelligent spatial visualization tool that transforms Google Sheets into interactive maps. Powered by Google Gemini, it automatically detects coordinate columns and handles messy data formatting so you don't have to.

---

## ✨ Features

- 🧠 **AI-Powered Mapping:** Automatically identifies `Latitude` and `Longitude` columns using Gemini 3 Flash.
- 📍 **Smart Markers:** Supports "Latento" labels and custom coloring based on any data column.
- 🌓 **Day/Night Modes:** Optimized map themes for any environment.
- 📊 **Data Integration:** Direct connection to Google Sheets (via CSV export).
- 🛠 **Robust Parsing:** Handles WGS84, European decimal commas, and combined coordinate strings.

## 🚀 How to Setup (For FREE)

You do **not** need a paid account to use or share this app.

1. **Get a Free API Key:**
   - Go to [Google AI Studio](https://aistudio.google.com/).
   - Click **"Get API key"** and create one for a new project.
2. **Deploy to Vercel/Netlify:**
   - Fork or upload this repo to your GitHub.
   - Connect it to Vercel or Netlify.
   - Add a new **Environment Variable** named `API_KEY` and paste your free key there.
3. **Done!** Your app is live and free to use for you and your colleagues.

## 📖 How to Use

1. **Prepare your Sheet:**
   - Ensure your Google Sheet has coordinate data.
   - Set the share settings to **"Anyone with the link can view"**.
2. **Launch the App:**
   - Paste your Sheet URL into the top search bar.
   - Click **Visualize**.
3. **Explore:**
   - Use the sidebar to see AI-generated insights about your data.
   - Change "Marker Style" to color your map points by different categories in your sheet.

## 🛠 Tech Stack

- **React 19** & **TypeScript**
- **Google Gemini API** (Free Tier)
- **Leaflet.js** (Mapping)
- **Tailwind CSS** (Styling)

---
*Built with SheetPlotter AI - Turning rows into roads.*
