

# Fix: Voice Recording Infinite Buffering

## Problem

The current flow downloads the **entire audio file** through the edge function as a blob before playing. This means:
1. Edge function fetches full audio from S3 → streams to client
2. Client waits for **entire blob download** (`response.blob()`) before playing
3. Large recordings = long wait = "infinite buffering"

## Root Cause

`<audio>` elements don't have CORS restrictions — they can natively play cross-origin URLs. The proxy was built to work around `fetch()` CORS, but we don't need to `fetch()` the audio at all.

## Fix (2 changes)

### 1. Edge function: Return the URL instead of streaming audio

Add a `?urlOnly=true` mode to `proxy-recording` that returns the S3 URL as JSON after auth verification, instead of proxying the entire audio stream. This is a fast metadata lookup — no large download.

### 2. Client: Set `audio.src` directly to the S3 URL

Change `AudioPlayer` in `CheckInLog.tsx` to:
1. Call proxy-recording with `urlOnly=true` → get the direct S3 URL (fast, ~200ms)
2. Set `audio.src` to that URL → browser handles streaming natively (instant playback, no full download needed)

This eliminates both the edge function streaming bottleneck and the client-side blob buffering.

