# Video Generation Alternatives (Since Sora API Isn't Public Yet)

## ✅ Available AI Video Generators

### 1. **Runway Gen-3** (Recommended)
- **Website**: https://runwayml.com/
- **Status**: Available now
- **How to use**:
  1. Sign up at runwayml.com
  2. Go to Gen-3 Alpha
  3. Enter prompt: "A dramatic fiery flaming waterfall cascading down, with bright orange, red, and yellow flames instead of water flowing downward like a waterfall, intense heat distortion, glowing embers rising upward, dark smoky background, cinematic lighting"
  4. Generate 5-second clip
  5. Download and save to `public/fallsonfire.mp4`

### 2. **Pika Labs**
- **Website**: https://pika.art/
- **Status**: Available now
- **Discord**: Join their Discord for access
- **Similar process**: Enter prompt and download result

### 3. **Leonardo AI Motion**
- **Website**: https://leonardo.ai/
- **Status**: Available now
- **Features**: Image-to-video and text-to-video

### 4. **Stable Video Diffusion**
- **Website**: https://huggingface.co/stabilityai/stable-video-diffusion
- **Status**: Open source, run locally
- **Requires**: Some technical setup

## 📝 Recommended Prompt

For best results with any service, use this prompt:

```
A dramatic fiery flaming waterfall cascading down from above, 
with bright orange, red, and yellow flames instead of water, 
fire flowing like liquid downward, intense heat distortion, 
glowing embers and sparks rising upward, dark smoky background, 
cinematic lighting, high contrast, vivid colors, 
vertical composition, slow motion, 4K quality
```

## 🔥 Quick Start with Existing Video

The project already has a video at `public/fallsonfire.mp4`. The Falls on Fire scene is already configured to use it! Just run:

```bash
npm run dev
```

Then navigate to the "Falls on Fire" scene to see it in action with:
- Fire particle effects
- "FALLS ON FIRE" and "Camp Imagine" text overlays
- Audio reactivity

## 🛠️ When Sora Becomes Available

Once OpenAI releases Sora's API publicly, you can use the `generate-video.js` script:

```bash
npm run generate-video
```

Check https://openai.com/sora for updates on availability.

## 📧 Request Sora Access

If you want early access to Sora:
1. Visit https://openai.com/sora
2. Look for "Request Access" or waitlist options
3. Fill out any available forms

Note: Access is currently limited to select creators and safety testers.

