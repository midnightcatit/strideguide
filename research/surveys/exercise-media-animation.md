# Form and movement demonstrations for exercises and stretches

Survey for Stride Guide, a goal-tailored running and strength PWA on Cloudflare. Date: 2026-11-23. Prices in USD, current as of this date.

This looks at whether Stride Guide can add form and movement demonstrations (animations or short video) for exercises and stretches the way Runna does: can we embed YouTube, or is something else better, and is any of it feasible for a small team. The app must work offline, on phones, with a small bundle. That constraint drives most of the answer.

Verdict up front: do not use YouTube embeds for in-session form cues. Use a small set of self-hosted, short, silent, looping clips (or animated WebP) from an openly licensed source, paired with the textual cues we already generate. Details below.

## 1. YouTube embeds

### How it works and what the terms require
The YouTube embeddable player may be shown on another site or app. The API Services Terms of Service and the Developer Policies apply to any use of the embedded player, including plain `<iframe>` embeds, not only the JavaScript API.

Concrete requirements and limits, from Google's own docs and policies:

- Embedders must provide an HTTP Referer (an origin). The player must know where it is hosted.
- The player must not be rendered smaller than 200 by 200 pixels.
- You cannot charge users specifically for access to YouTube content, and you cannot market a YouTube-based experience as ad free. Restricting or covering the standard player controls is a policy violation. There is a public enforcement example of a site being flagged for presenting embedded playback as "zero ads".
- Branding and the player controls must stay visible. You cannot strip the YouTube logo, the title, or the interaction overlay.
- Child-directed apps must self-designate, and then personalized ads are turned off and some features are disabled. Our audience is adults, so this specific rule would not apply, but it shows how much of the player is Google's to control.
- Autoplay is governed by the browser, not by us. A muted, `playsinline` iframe can autoplay, but mobile browsers may still refuse, especially under Low Power Mode or on a metered connection.

### Privacy-enhanced mode is not a fix
`youtube-nocookie.com` is Google's privacy-enhanced mode. It defers cookie setting until playback, but it still loads Google code and still sets functional cookies once the user plays. For a European audience this is treated as a consent event; several sources are explicit that it still requires consent before load. This adds a consent surface to a product that currently has none.

### The offline and cost problems
This is the part that is decisive for a PWA:

- Requires internet. An embedded iframe streams from Google's servers. In the gym with bad signal, or offline, an embedded demo simply does not load. Our offline promise breaks.
- Tracking and data. The embed contacts Google on load, and playback streams video over the user's mobile data with no control over bitrate or file size. On a metered phone plan this is a real cost imposed on the user.
- Ads. YouTube can serve ads on embedded videos, including pre-roll, depending on the video, the channel, and the region. We do not control this. A pre-roll ad in the middle of a strength set is a bad product experience and something we cannot remove.
- Performance. Embedding a YouTube iframe drops mobile page weight and speed hard. One widely shared report measured a mobile PageSpeed score falling from 56 to 22 after adding an embed, and desktop from 93 to 70. A raw iframe pulls in a large amount of Google JavaScript and player code for what is, in our case, a three second looping movement.

### Licensing of third-party video
Embedding someone else's exercise video via the YouTube player is permitted by YouTube (that is what the embed is for), but it does not give us any right to the content. We would be dependent on that channel keeping the video public, not deleting it, not making it private, and not turning on monetization that injects ads. We would also be leaning on a third party's coaching cues and voice, which may conflict with ours. We cannot download, re-encode, or bundle those videos into the app; that would be a separate copyright problem.

### Summary
YouTube embeds fail the two hard requirements of this product: offline, and small bundle. They also introduce ads, tracking, cookie consent, no control over data use, and full dependence on a third party. As a link that opens the YouTube app for optional further watching, they are fine. As the in-session demonstration mechanism, they are not.

## 2. Self-hosted short looping video (MP4/WebM)

### How it works
Encode each movement as a 2 to 6 second silent loop, served from Cloudflare R2, played with a `<video>` element that has `muted`, `playsinline`, `loop`, `autoplay` (or play on tap), and a `poster` image. `preload="none"` or `metadata` plus lazy loading keeps it out of the initial bundle. IntersectionObserver starts and stops playback as the card enters and leaves view. For offline, a service worker caches the clips on first view or on demand.

### File sizes and quality
Short clips are tiny. A 480 to 600 pixel wide, 12 to 15 fps, 3 second H.264 MP4 loop is typically 50 to 150 KB, and a WebM (VP9 or AV1) can be smaller. A static poster is 20 to 40 KB. For a movement demo, motion clarity matters more than resolution, so 480 px reads fine.

### Offline and cost
Because the files come from our origin, they cache in the browser and in the service worker and then play with no network. Egress from R2 is free, which is the main reason this fits. Cloudflare R2 pricing (current):

- Storage: $0.015/GB-month (Standard). Free tier 10 GB-month.
- Class A operations (writes): $4.50 per million. Free tier 1 million/month.
- Class B operations (reads): $0.36 per million. Free tier 10 million/month.
- Egress to the internet: free.

Two hundred 3 second clips at roughly 120 KB each is about 24 MB of storage, which sits inside the free tier. Even ten thousand reads a month is far inside the free Class B allowance. Storage cost at this scale rounds to zero.

Cloudflare Stream is the other option. Stream bills on minutes stored ($5/month per 1,000 minutes) and minutes delivered ($1 per 1,000 minutes). Stream is built for adaptive streaming of longer video, not for 3 second loops. It is the wrong tool here: R2 plus a plain file is simpler, cheaper, and caches cleanly client side (Stream notes that client-cached short looping video is not billed, but the player and HLS machinery are still more than we need).

### Pros
- Works fully offline once cached. This is the deciding advantage.
- Free egress, negligible storage cost at our scale.
- No ads, no tracking, no third-party dependency, no cookie consent.
- Full control of quality, size, and content.
- Caches in the service worker like any other asset.

### Cons
- We must produce or license the footage. This is the real cost (see section 6).
- Video decode has a battery and CPU cost on phones. A few small loops on screen at once is fine; dozens autoplaying is not. Mitigate with IntersectionObserver and play only the visible card, or play on tap.
- Browser autoplay policy means muted and `playsinline` are mandatory, and Low Power Mode may still block autoplay, so a tap-to-play fallback and a poster are needed.
- Two encodings (MP4 and WebM) if we want the best size with wide support, though a plain MP4 (H.264) alone covers effectively all current phones.

### Verdict
This is the recommended mechanism. It is the only option that satisfies offline, small bundle, no tracking, and no third-party control, at near-zero hosting cost.

## 3. Animated GIF, animated WebP, animated AVIF

### File sizes
- GIF is the worst of the three, roughly 10 to 20 times larger than the equivalent MP4. It is a 256 color format and is genuinely bad for photos and gradients. Animated GIF demos are the reason so many fitness apps feel heavy.
- Animated WebP is about 64 percent smaller than GIF on average for lossy encoding, per Google's own figures, and keeps a normal `<img>` embed. A 10 second clip that is 4 MB as a GIF lands around 300 to 700 KB as animated WebP.
- Animated AVIF is smaller again, often by a wide margin, but encode and decode are slower and support is narrower on older devices.

### The embed trade
Animated WebP and AVIF keep the `<img>` tag, so they inherit everything an image gets: no autoplay negotiation, no `playsinline`, renders anywhere an image renders, and caches exactly like a static image. The cost is roughly 40 percent more bytes than MP4 for the same clip and a heavier decode than a video codec (each frame is compressed separately, with less inter-frame reuse). Animated WebP is best for very short clips (under about 15 seconds) at 600 px or less; beyond that, size and decode cost grow quickly.

### Offline and cost
Same as any image asset: cache in the service worker, serve from R2, free egress. Content-hashed filenames make cache invalidation trivial.

### Pros
- Simplest possible embed path (`<img src>`), works everywhere, no autoplay policy.
- Far smaller than GIF, good enough quality for a movement loop.
- Caches like a static image.

### Cons
- Bigger and more CPU-expensive to decode than an equivalent MP4.
- Animated AVIF support is not universal on older phones.
- The open licensed GIF libraries are the licensing trap (see section 4).

### Verdict
A solid secondary option. If we want the absolute simplest client code and a pure image pipeline, animated WebP from R2 is a good choice. If we are encoding from video anyway, MP4 is smaller and cheaper to decode, so MP4 leads and animated WebP is a fallback.

## 4. Lottie

### How it works
Lottie is a JSON vector animation format (exported from After Effects via Bodymovin) rendered in the browser with `lottie-web`. It is excellent for UI icon motion and simple looping vector figures. It is not photographic and does not show a real person's form.

### Bundle and performance
`lottie-web` is about 75 KB minified and gzipped (roughly 299 KB unminified), and that is the whole runtime, including SVG, canvas, and HTML renderers. This is a meaningful addition to a bundle that must stay small, and it is one more dependency to keep patched. Lottie is real-time rendering, so CPU cost scales with animation complexity and with how many run at once. Vector Lottie files themselves can be small.

### Licensing and fit
The runtime is MIT. The animations are only as good as who draws them, and drawing a correct, credible movement figure for hundreds of exercises is itself a content project. A stylized vector figure might read as unserious for a running and strength coach app, and it cannot show grip, foot placement, or real range of motion the way footage does.

### Verdict
Not the right primary mechanism. The bundle cost and the drawing effort are both real, and a vector figure conveys less form information than a loop of real movement. Reasonable only for small UI accents, not for exercise demonstrations.

## 5. 3D and rigged models

### The idea
Load a rigged human model (`.glb`) and play skeletal animations in the browser with three.js or Babylon.js. This is what some workout apps use: a single model, many skeletal clips, small asset sizes, fully offline, and no photographer needed.

### Licensing
- Mixamo (Adobe) provides a free library of rigged characters and animation clips, downloadable as FBX or glTF/GLB, usable in personal, commercial, and non-profit projects with no royalty. The one clear restriction is that you may not resell the assets standalone (you cannot redistribute the raw Mixamo assets as an asset pack); using them as part of a product is allowed. Attribution is not required, though it is polite.
- A free readyplayer.me account lets you generate custom avatars and export them.
- Blender is free and open source, so a model can be made and licensed cleanly if we build one ourselves.

### Cost and effort
The asset cost is zero (Mixamo, readyplayer.me, Blender). The cost is entirely in effort and runtime:

- Runtime: three.js is roughly 150 KB minified and gzipped for the core, more with loaders and animation helpers. Babylon.js is larger. This is a large addition to a small-bundle PWA.
- Model weight: a rigged, textured GLB is typically 1 to 5 MB, which is far heavier than a few short video clips for the same coverage.
- Authoring: mapping hundreds of exercises to correct skeletal clips is a real animation project, not a weekend task. Ensuring the model's motion is anatomically credible for each movement is the hard part.

### Offline
Excellent if done, since a model plus skeletal clips cache as ordinary assets. But the up-front authoring and the runtime weight make it impractical for a small team as a first move.

### Verdict
Technically the most elegant long-term answer for a fully offline, no-photographer demo library, and the licensing is workable. But the authoring effort for hundreds of moves plus a large 3D runtime is too much for a small team now. Revisit only if a future design calls for a consistent animated avatar and we have animation capacity.

## 6. Open media sources usable legally

This is where most projects trip. The animations are the easy part; the license to ship them is the hard part.

### free-exercise-db (public domain)
`yuhonas/free-exercise-db` is over 800 exercises in JSON with a JSON schema, released under the Unlicense (public domain). Media are static JPGs per exercise, usually two frames (start and end position) such as `0.jpg` and `1.jpg`. There is no animation, but the two-frame pair can be cross-faded in CSS to suggest the movement, or used as a before/after. Because it is public domain, there is no attribution requirement and no commercial restriction. This is the safest legal base to build on.

### hasaneyldrm/exercises-dataset (media is NOT open)
`hasaneyldrm/exercises-dataset` is tempting: 1,324 exercises, each with a 180 by 180 animated GIF, a thumbnail, and step-by-step instructions in ten languages. But read the license carefully. The code, the dataset structure, and the instruction text are MIT. The **media (images and GIFs) is copyrighted by Gym visual and only redistributed there with permission**. Reuse requires obtaining your own license from gymvisual.com. We cannot treat these GIFs as open. Do not ship them without a license. Also note the media is 180 by 180, which the exercise-API surveyor community already calls dated for a production app.

### ExerciseDB / AscendAPI, RepDB, MuscleWiki, Your Move, WorkoutX
There is a whole market of paid exercise media APIs, and the terms vary a lot:

- ExerciseDB (AscendAPI), paid via RapidAPI, animated GIFs or MP4, thousands of exercises. The free hosted version's media license is explicitly not spelled out, which is a red flag for commercial shipping.
- RepDB (`RepDB/exercise-dataset`) offers a free tier for in-app use with visible RepDB attribution, and a Standard license at $499 once for use under your own brand with no attribution.
- MuscleWiki API states commercial use is the intended use and is included in paid plans.
- Your Move provides filmed video from real trainers from about $29/month.
- WorkoutX offers 1,900+ exercises as 720p video.

For a small team, the practical path is either the public-domain free-exercise-db (free, no animation) or a one-time licensed dataset (RepDB Standard at $499 is the cleanest single number) if we want animation without producing it ourselves. Recurring API subscriptions are a poor fit for an app that must work offline, because we would need to download and cache the media anyway.

### Wikimedia Commons
Commons only accepts freely licensed media: CC BY, CC BY-SA, CC0, and public domain. Non-commercial licenses (CC BY-NC) are not accepted. So anything on Commons is usable commercially, but CC BY and CC BY-SA require attribution, and CC BY-SA requires that adaptations be shared under a compatible license. There is useful physiology and exercise imagery there, but coverage of specific gym movements is thin and inconsistent. Useful as a supplement, not as a system.

### GIF exercise libraries, the licensing caveat
Animated exercise GIFs circulating on GitHub and in "free" datasets are very often scraped from a commercial provider (several issues on the hasaneyldrm repo note the media traces back to a commercial source). A GitHub repository being public does not make its media open. Any GIF library must be checked at the media level, not the repository level, before shipping.

## What comparable apps do

- **Runna.** In-app: tapping an exercise image in a strength session opens an animation plus coaching tips on correct form (from Runna's own support docs). It also publishes form tutorial videos on its own YouTube channel. Users have complained that the in-app animated avatar and the live-action videos do not always match, which is a concrete warning about mixing two media styles. Runna also sells a running form-analysis feature, distinct from the demo library.
- **Nike Run Club.** Audio-guided runs; coaching is in the ear, no form demo library. Nike Training Club, its strength sibling, is video-led.
- **Peloton.** Recorded studio classes, streamed. This is long-form video, not a per-movement demo library; it requires connectivity and is a different product shape.
- **Apple Fitness+.** Recorded class video and audio, streamed, tied to Apple devices.
- **Strong and Hevy.** Workout loggers. Hevy ships per-exercise demonstration media (historically animated clips for a large exercise set) as part of its own product; both are native apps, so bundle size and streaming are less constrained than our PWA.
- **Strava.** Activity tracking and social features. No form demonstration library.
- **Fitbod.** Written cues and per-exercise imagery rather than video demos.

The pattern: apps that show real form either license or produce media and host it themselves, or they are native apps streaming long-form classes. None of the serious ones embed third-party YouTube for in-session cues. The ones with the smallest footprint (Fitbod, Nike Run Club's audio runs) lean on text, imagery, and audio instead of video.

## Feasibility verdict

Feasible, and worth doing, but not via YouTube, and not all at once.

### YouTube embeds: qualified no
Say no for in-session demonstrations. A yes only as an optional "watch more on YouTube" external link that opens the YouTube app, where it does not affect offline behavior, bundle size, or the in-app experience. Do not embed iframes in the workout UI.

### Recommended path
Start with a small pilot, then grow only if it proves itself:

1. **Phase 0, text and static art (near zero cost, days).** Ship the written cues we already generate, plus start and end frame images per movement from the public-domain `free-exercise-db`. Cross-fade the two frames in CSS to imply the motion. This is free, fully offline, zero third-party dependency, and immediate. It answers most "what should this look like" questions without any video.

2. **Phase 1, a handful of short looping clips (small cost, one to two weeks).** For the 15 to 25 moves that most need demonstration (the ones people actually get wrong: hinge, split squat, step up, lateral raise, deadlift, calf raise, and their stretch counterparts), produce or license short silent loops. Encode to MP4 (H.264, muted, `playsinline`, `loop`, `poster`), store in R2, lazy load with IntersectionObserver, and cache in the service worker on first view. Ship animated WebP as a fallback only if the image pipeline proves simpler.

3. **Phase 2, broader coverage (optional, only with a content budget).** If the pilot earns its place, extend to the full strength and stretch catalog using either a one-time licensed dataset (for example RepDB Standard at $499 once) or a small batch of self-filmed clips per release, and convert to our own MP4/WebP.

### Effort estimate
- Phase 0: roughly 2 to 4 days of engineering (data mapping, cross-fade component, caching), no content cost.
- Phase 1: roughly 1 to 2 weeks. Most of that is sourcing and encoding 15 to 25 clips and the video component (poster, lazy load, IntersectionObserver, reduced-motion handling, service worker caching), not the code itself.
- Phase 2 (hundreds of moves): content-bound, not code-bound. Budget a few days per release of mixed sourcing/encoding plus a one-time license fee if buying a dataset. Producing hundreds of clips from scratch is weeks of work and is the reason to buy or license rather than film.

### Cost estimate
- Hosting: effectively $0. A few dozen clips at 100 KB each is a couple of megabytes, inside R2's free 10 GB-month tier, with free egress and reads inside the free Class B allowance. Even the full catalog stays cheap: 1,300 clips at 120 KB is about 156 MB of storage, roughly $0.002/month after the free tier, with egress always free.
- Stream: not needed, and not wanted for 3 second loops.
- Content: $0 if we use public-domain imagery plus a few self-produced clips; about $499 once if we buy a licensed dataset for full coverage; $29+/month if we subscribe to a video API, which we should avoid because offline requires downloading the media anyway.
- Runtime: zero added JS if we use `<video>` or `<img>`. This is the key point against Lottie (about 75 KB gzipped) and three.js (about 150 KB gzipped and up).

## Risks

- **Licensing.** The biggest risk. "Public GitHub repo" does not mean "open media". The popular animated GIF dataset is © Gym visual and needs a paid license. Every media source must be checked at the media level, and that check recorded, before shipping. Keep the attribution required by whichever license we use, and keep CC BY-SA media out if we do not want share-alike obligations.
- **Autoplay and Low Power Mode.** Mobile browsers may refuse autoplay even when muted, and Low Power Mode commonly blocks it. Always ship a poster image, a tap-to-play fallback, and a design that reads without motion.
- **Reduced motion.** Users with `prefers-reduced-motion: reduce` must get a static frame or the cross-fade, not an autoplaying loop. Treat looping motion as decoration that can be turned off.
- **Accessibility.** Provide alt text and, where clips have on-screen text or spoken cues, captions or transcripts. Silent loops are the simple case, but any voiceover we add later needs captioning.
- **Data usage and battery.** Even small loops cost mobile data on first view and CPU while playing. Play only the visible card, cap concurrent playback, and cache aggressively in the service worker.
- **Cache size.** Caching hundreds of clips on a phone is fine at the numbers above (well under 200 MB), but we must expose a way to clear cached media and respect storage pressure; a cache-first service worker that silently fills storage is a misstep.
- **Content credibility.** Bad form in a demo teaches bad form. Whatever source we use must actually be correct for the movement and the equipment. Mixing styles (a vector avatar next to filmed footage) reads as inconsistent, which is exactly the Runna complaint.
- **Scope creep.** The temptation is to cover hundreds of moves immediately. That is a content project with a real budget. The pilot approach is what keeps this affordable and reversible.

## Sources

- YouTube embed help and requirements: https://support.google.com/youtube/answer/171780
- YouTube API Services Terms of Service: https://developers.google.com/youtube/terms/api-services-terms-of-service
- YouTube embedded player parameters: https://developers.google.com/youtube/player_parameters
- YouTube embed page-speed impact discussion: https://www.reddit.com/r/webdev/comments/19ewd78/
- Privacy-enhanced mode and consent: https://www.flowconsent.com/en/blog/youtube-nocookie-embed-videos-without-cookies-gdpr
- Runna: exercise animations in strength sessions: https://support.runna.com/en/articles/15624879-adding-strength-training-to-your-runna-plan
- Runna: animation vs live video mismatch: https://www.reddit.com/r/runna/comments/1nt30qc/
- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/
- Cloudflare Stream pricing: https://developers.cloudflare.com/stream/pricing/
- free-exercise-db (Unlicense, public domain): https://github.com/yuhonas/free-exercise-db
- hasaneyldrm exercises-dataset (media © Gym visual): https://github.com/hasaneyldrm/exercises-dataset
- RepDB exercise dataset and pricing: https://github.com/RepDB/exercise-dataset
- Exercise API comparison (ExerciseDB, Your Move, WorkoutX): https://ymove.app/exercise-api/top-exercise-apis
- MuscleWiki API (commercial use): https://api.musclewiki.com/
- Mixamo licensing (free, commercial use, no resale of assets): https://community.adobe.com/questions-696/mixamo-faq-licensing-royalties-ownership-eula-and-tos-589400
- Wikimedia Commons licensing (no NC, attribution, share-alike): https://commons.wikimedia.org/wiki/Commons:Licensing
- Creative Commons license terms: https://creativecommons.org/cc-licenses/
- Animated WebP vs GIF, file sizes and decode: https://www.ffmpeg-micro.com/blog/convert-video-to-animated-webp-with-ffmpeg-10x-smaller-than-gif
- Animated image format comparison (GIF/WebP/AVIF/MP4): https://akshayranganath.github.io/Comparing_Animated_Image_Formats/
- lottie-web bundle size: https://bundlephobia.com/package/lottie-web
- lottie-web repository and renderers: https://github.com/airbnb/lottie-web
- Nike Run Club (audio-guided runs): https://www.nike.com/nrc-app
- Voice-guided workout comparison (Peloton, Apple Fitness+, NTC, Fitbod): https://www.rayfit.com/blog/2026/02/voice-guided-workout-app/
