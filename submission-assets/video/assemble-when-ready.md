# Assemble when actual footage is ready

No screen footage or narration audio exists in this workspace, and `ffmpeg` is not installed. Therefore no MP4 has been created.

After a human records real files, place them here as:

```text
screen-footage.mp4
narration.wav
```

Install or use an existing ffmpeg environment outside this repository, then run:

```powershell
ffmpeg -i screen-footage.mp4 -i narration.wav -i final-captions.srt `
  -map 0:v:0 -map 1:a:0 -c:v libx264 -pix_fmt yuv420p -c:a aac `
  -vf "subtitles=final-captions.srt" -shortest BURHAN-demo-final.mp4
```

Verify the output is below three minutes, that captions match real narration, and that no synthetic or misleading footage has been added.
