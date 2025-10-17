# Webcam Interactive Controls Guide

## Overview

All 78 visual scenes now support webcam-based motion tracking as an alternative input method. The webcam works **simultaneously** with mouse input, allowing you to control the visuals by moving in front of your camera.

## How It Works

The system uses **motion detection** and **blob tracking** to:
- Track your movement centroid as cursor position
- Detect motion intensity for click gestures
- Smooth the tracking for stable interaction

## Getting Started

1. **Open the application** in your browser
2. **Open the controls menu** (menu button in top-left)
3. **Find the "📹 Webcam Input" section**
4. **Click "Enable Webcam"**
5. **Grant camera permissions** when prompted
6. **Move in front of your camera** to control the cursor

## Controls

### Enable Webcam
Toggle webcam tracking on/off. When first enabled, you'll be prompted for camera permissions.

### Motion Sensitivity (0-100)
- **Lower values** (20-40): Only detect large movements
- **Default** (30): Balanced sensitivity
- **Higher values** (50-80): Detect subtle movements

### Click Threshold (0-100)
- **Lower values** (40-60): Easy to trigger clicks with quick motions
- **Default** (70): Moderate threshold
- **Higher values** (80-100): Require more dramatic movements to click

### Position Smoothing (0-100)
- **Lower values** (10-30): Fast, jittery movement
- **Default** (30): Balanced smoothing
- **Higher values** (50-80): Slow, smooth movement

### Show Debug Overlay
Enable to see:
- Live motion detection preview
- Centroid crosshair position
- Motion intensity bar (turns red when click threshold is exceeded)
- Current input source (webcam/mouse)
- Position coordinates

## Usage Tips

### Cursor Control
- Move **left/right** or **up/down** in the camera frame
- The cursor follows the **centroid of your motion**
- Larger movements = faster cursor movement
- Hold still to maintain position

### Triggering Clicks
- Make a **quick, sudden movement** (like a punch or wave)
- The motion intensity bar will turn **red** when threshold is exceeded
- A click is automatically triggered
- There's a cooldown period (0.5s) between clicks to prevent spam

### Best Practices
1. **Good lighting**: Ensure your area is well-lit for better motion detection
2. **Contrasting background**: Stand in front of a plain, stationary background
3. **Optimal distance**: Stay 2-3 feet from the camera
4. **Wear contrasting colors**: Helps with motion detection
5. **Adjust sensitivity**: Tune settings based on your environment

### Troubleshooting

**"Failed - check permissions"**
- Ensure you granted camera access in the browser
- Check browser settings to enable camera for this site
- Try refreshing the page

**Cursor is jittery**
- Increase "Position Smoothing"
- Reduce "Motion Sensitivity"
- Improve lighting conditions

**Cursor doesn't move**
- Increase "Motion Sensitivity"
- Check debug overlay to verify motion is detected
- Try larger movements

**Accidental clicks**
- Increase "Click Threshold"
- Move more smoothly
- Avoid quick, jerky movements unless clicking

**Clicks not registering**
- Decrease "Click Threshold"
- Make more dramatic quick movements
- Check motion intensity bar in debug overlay

## Technical Details

### Performance
- Processes at 30 FPS maximum
- Downscaled to 160x120 for efficient processing
- Minimal CPU overhead (~5-10% on modern systems)

### Privacy
- All processing happens **locally in your browser**
- No video data is sent to any server
- Camera can be disabled at any time

### Compatibility
- Works on any modern browser with webcam support
- Tested on Chrome, Firefox, Safari, Edge
- Requires HTTPS or localhost for camera access

### Integration
- Works with **all 78 scenes** without modification
- Can be used **simultaneously with mouse** input
- Graceful fallback to mouse when webcam disabled
- No performance impact when disabled

## Advanced Usage

### Combining with Audio Reactivity
Enable both webcam and audio (microphone) for a fully immersive experience:
1. Enable Audio → "Enable Microphone"
2. Enable Webcam → "Enable Webcam"
3. Move to music and watch the visuals respond to both!

### Multi-Layer Mode + Webcam
The webcam works perfectly with composition mode:
- All layers respond to webcam input simultaneously
- Each scene interprets motion differently
- Creates unique interactive experiences

### Custom Gestures
Experiment with different movement patterns:
- **Circles**: Create swirling patterns
- **Quick jabs**: Trigger effects
- **Slow waves**: Smooth transitions
- **Jumps**: Dramatic changes

## Scene Recommendations

Some scenes work particularly well with webcam:
- **Particle Swarm**: Follow your movements fluidly
- **Fireflies**: React to quick motions
- **Magnetic Lines**: Create dynamic magnetic fields
- **Lightning**: Strike where you move
- **Flocking**: Birds follow your position
- **Mandala**: Interactive pattern generation
- **Kaleidoscope**: Mirror your movements

## Future Enhancements

Potential future features:
- Color blob tracking (track specific colors)
- Hand pose detection (finger gestures)
- Face tracking (facial expressions)
- Multi-person tracking
- Depth sensing (with compatible cameras)
- Recording and playback of motion patterns

---

**Enjoy creating with motion!** 🎨📹

