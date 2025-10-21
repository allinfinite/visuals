# Whisper Vision Setup Guide

Whisper Vision is an AI-powered visual pattern that transcribes your speech in real-time and generates trippy psychedelic images based on what you say.

## Requirements

### Required API Keys

1. **OpenAI API Key** (required for speech transcription)
   - Used for real-time speech-to-text via GPT-4 Realtime API
   - Get from: https://platform.openai.com/api-keys

2. **Image Generation API** (choose one):
   - **OpenAI** - gpt-image-1-mini (faster, decent quality)
   - **GetImg.ai** - Flux Schnell (potentially better quality)
   - Get GetImg.ai key from: https://getimg.ai/

## Setup

### 1. Create `.env.local` file in project root:

```bash
# Required: OpenAI key for speech transcription
VITE_OPENAI_API_KEY=sk-proj-your-openai-key-here

# Optional: GetImg.ai key for Flux (if not set, falls back to OpenAI for images too)
VITE_GETIMG_API=your-getimg-api-key-here

# Optional: Choose image generation model (default: openai)
VITE_IMAGE_MODEL=flux   # or 'openai'
```

### 2. Environment Variable Options

**VITE_IMAGE_MODEL** controls which model generates images:
- `openai` - Uses OpenAI's gpt-image-1-mini (default)
- `flux` - Uses GetImg.ai's Flux Schnell model

### 3. Build and run:

```bash
npm run build
npm run dev
```

## How It Works

### Real-Time Speech Processing
1. **Continuous Recording** - Streams audio to OpenAI Realtime API via WebSocket
2. **Live Transcription** - GPT-4 transcribes as you speak
3. **Topic Detection** - Splits speech into individual topics/sentences
4. **Queue System** - Each topic queued for separate image generation

### Image Generation
- **One image per topic** - "Falls on Fire" gets one image, "dolphins" gets another
- **12 Visual Styles** - Rotates through different psychedelic aesthetics:
  - Neon kaleidoscopic
  - Liquid chrome holographic
  - Bioluminescent sacred geometry
  - Cosmic nebula crystalline
  - Electric plasma spirals
  - Watercolor psychedelic
  - Glitch art digital
  - Mandala patterns
  - Aurora borealis ribbons
  - Abstract expressionism
  - Vaporwave retro
  - Oil painting surreal

### Ken Burns Effect
- 30-second slow zoom and pan per image
- 3-second cross-fade transitions
- Continuous movement (no freezing)

## Status Indicators

Look for the status bar in the top-left corner:

- 🔴 **Red dot** - Recording audio
- 🟠 **Orange dot** - Transcribing speech OR pending topics in queue
- 🟢 **Green dot** - Generating image with OpenAI
- 🔵 **Cyan dot** - Generating image with Flux
- **White dots** - Number of images loaded
- **Model circle** - Green (OpenAI) or Cyan (Flux) shows active model

## Cost Estimates

### OpenAI
- Realtime API: ~$0.06 per minute of audio
- gpt-image-1-mini: ~$0.01-0.02 per image
- **Example:** 10 min conversation with 5 images = ~$0.70

### Flux Schnell (via GetImg.ai)
- Flux Schnell: pricing varies by GetImg.ai plan
- Generally faster generation
- Often better quality/detail

## Troubleshooting

### Pattern doesn't appear in list
- Check that `VITE_OPENAI_API_KEY` is set in `.env.local`
- Restart dev server after adding env variables
- Pattern only loads if OpenAI key is present

### No speech detection
- Allow microphone permissions when prompted
- Check browser console for errors
- Ensure audio is being captured (red dot should appear)

### Images not generating
- Check which model is selected (Green = OpenAI, Cyan = Flux)
- Verify appropriate API key is set
- Check browser console for API errors
- Minimum 20 characters required per topic

### Wrong model being used
- Set `VITE_IMAGE_MODEL=flux` or `VITE_IMAGE_MODEL=openai` in `.env.local`
- Restart dev server
- Check console log on startup for active model

## Example .env.local

```bash
# Use OpenAI for everything
VITE_OPENAI_API_KEY=sk-proj-...
VITE_IMAGE_MODEL=openai

# Use Flux for images, OpenAI for transcription
VITE_OPENAI_API_KEY=sk-proj-...
VITE_GETIMG_API=...
VITE_IMAGE_MODEL=flux
```

