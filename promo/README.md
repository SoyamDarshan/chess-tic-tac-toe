# Launch video

`brag.mp4` is a 21.8 second, 1080p launch video for the game. `brag.jpg` is its poster, `share-copy.txt` is text to post with it, and `brag-plan.md` is the storyboard.

The video shows one real 17-turn game, replayed with the engine in `../src/engine.js`, so every move on screen is legal.

## Rebuild

Needs Node 18+, Python 3 with numpy, and ffmpeg. Run these from this `build/` folder:

```
npm install
node make_data.js            # replays the game and writes game.json
node build_video_page.js     # writes video.html, copies fonts, writes events.json
npx playwright install chromium
mkdir frames && node capture.js          # 654 frames at 30 fps
python3 synth.py             # writes music.wav, synced to the events
cp frames/f_0540.jpg ../brag.jpg && cp ../brag.jpg frames/f_0000.jpg
cd frames && ffmpeg -framerate 30 -i f_%04d.jpg -i ../music.wav -af loudnorm=I=-16:TP=-1.5:LRA=7 -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart -shortest ../../brag.mp4
```

`find_game.js` is the search that picked the game (seed 46). `node stills.js 3 8 12` saves still frames at those times for a quick look.
