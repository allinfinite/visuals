#!/usr/bin/env node

/**
 * Generate a fiery waterfall video using OpenAI Sora API
 * 
 * Setup:
 * 1. npm install openai
 * 2. Set OPENAI_API_KEY environment variable
 * 3. Run: node generate-video.js
 */

import OpenAI from 'openai';
import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const OUTPUT_PATH = path.join(__dirname, 'public', 'fallsonfire.mp4');
const PROMPT = `A dramatic fiery flaming waterfall cascading down, with bright orange, red, and yellow flames instead of water flowing downward like a waterfall, intense heat distortion, glowing embers rising upward, dark smoky background, cinematic lighting, high contrast, vivid colors, 4K quality`;

async function downloadVideo(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {}); // Delete the file on error
      reject(err);
    });
  });
}

async function generateVideo() {
  try {
    // Check for API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ Error: OPENAI_API_KEY environment variable is not set');
      console.log('\nPlease set your OpenAI API key:');
      console.log('  export OPENAI_API_KEY="your-api-key-here"');
      process.exit(1);
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    console.log('🎬 Generating video with Sora...');
    console.log(`📝 Prompt: "${PROMPT}"`);
    console.log('⏳ This may take a few minutes...\n');

    // Generate video using Sora
    // Note: As of October 2024, Sora API is in limited preview
    // Try different possible API endpoints
    let response;
    
    try {
      // Try the videos endpoint
      if (openai.videos && openai.videos.generate) {
        response = await openai.videos.generate({
          model: 'sora-2',
          prompt: PROMPT,
          duration: 5,
          resolution: '1080p',
        });
      } else {
        // Try direct API call
        response = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Please generate video' }],
        });
        throw new Error('Sora API endpoint not yet available in SDK');
      }
    } catch (apiError) {
      throw new Error(`Sora API not available: ${apiError.message}. Sora is currently in limited preview and not publicly accessible.`);
    }

    console.log('✅ Video generated successfully!');
    console.log(`🔗 Video URL: ${response.url}`);

    // Download the video
    console.log('\n📥 Downloading video...');
    await downloadVideo(response.url, OUTPUT_PATH);
    
    console.log('✅ Video saved to:', OUTPUT_PATH);
    console.log('\n🎉 Done! You can now use the Falls on Fire scene.');

  } catch (error) {
    if (error.status === 404) {
      console.error('\n❌ Error: Sora API endpoint not found');
      console.error('This likely means:');
      console.error('  1. Sora API is not yet available for your account');
      console.error('  2. The API endpoint has changed');
      console.error('  3. You need to request access to Sora\n');
      console.error('Current Sora status: Limited preview');
      console.error('Visit: https://openai.com/sora for access information\n');
    } else if (error.status === 401) {
      console.error('\n❌ Error: Invalid API key');
      console.error('Please check your OPENAI_API_KEY is correct\n');
    } else {
      console.error('\n❌ Error generating video:', error.message);
      if (error.response) {
        console.error('Response:', error.response.data);
      }
    }
    process.exit(1);
  }
}

// Run the generation
generateVideo();

