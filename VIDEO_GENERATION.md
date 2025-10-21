# Video Generation with OpenAI Sora

This guide explains how to generate a custom video for the Falls on Fire scene using OpenAI's Sora API.

## Prerequisites

1. **OpenAI API Key with Sora Access**
   - You need an OpenAI API key with access to Sora (currently in limited preview)
   - Visit [OpenAI Platform](https://platform.openai.com/) to get your API key
   - Check [Sora availability](https://openai.com/sora) for access status

2. **Node.js**
   - Node.js 18+ is required (already installed if you're running this project)

## Setup

### 1. Install Dependencies

```bash
npm install
```

This will install the `openai` package and other required dependencies.

### 2. Set Your API Key

Set your OpenAI API key as an environment variable:

**On macOS/Linux:**
```bash
export OPENAI_API_KEY="sk-your-api-key-here"
```

**On Windows (PowerShell):**
```powershell
$env:OPENAI_API_KEY="sk-your-api-key-here"
```

**Or create a `.env` file** in the project root:
```
OPENAI_API_KEY=sk-your-api-key-here
```

## Generate Video

Run the video generation script:

```bash
npm run generate-video
```

Or directly:
```bash
node generate-video.js
```

## What It Does

The script will:
1. Connect to OpenAI's Sora API
2. Generate a 5-second video with the prompt:
   > "A dramatic fiery flaming waterfall cascading down, with bright orange, red, and yellow flames instead of water flowing downward like a waterfall, intense heat distortion, glowing embers rising upward, dark smoky background, cinematic lighting, high contrast, vivid colors, 4K quality"
3. Download the generated video
4. Save it to `public/fallsonfire.mp4`

The video will automatically be used by the Falls on Fire scene.

## Customization

To customize the video generation, edit `generate-video.js` and modify:

- **PROMPT**: Change the description to generate different visuals
- **duration**: Change video length (5 seconds default)
- **resolution**: Change output resolution ('1080p' default)
- **OUTPUT_PATH**: Change where the video is saved

## Troubleshooting

### "Sora API endpoint not found"
- Sora is currently in limited preview and may not be available for all accounts
- You may need to request access from OpenAI
- Check the [official Sora page](https://openai.com/sora) for availability

### "Invalid API key"
- Verify your API key is correct
- Ensure you have Sora access enabled on your account

### API Changes
- As Sora is new, the API might change
- Check [OpenAI's documentation](https://platform.openai.com/docs) for the latest API format
- You may need to update the `generate-video.js` script accordingly

## Alternative Approach

If Sora isn't available yet, you can:
1. Use other AI video generators (Runway, Pika Labs, etc.)
2. Manually download/create a video
3. Place it at `public/fallsonfire.mp4`

The scene will work with any MP4 video file at that location.

