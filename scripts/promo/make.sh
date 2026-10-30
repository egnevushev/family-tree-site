#!/bin/sh
# The site video in one language: records the scenes (record.cjs), takes the music (music.m4a, or MUSIC=<file>,
# else a tune made by music.py), joins it all with ffmpeg.
#   python3 scripts/serve.py &
#   sh scripts/promo/make.sh en        (and ru; NORECORD=1 reuses the frames)
# The output is site-media/intro-<lang>.mp4 with its poster intro-<lang>.jpg; data/site.json "intro_video" and
# "intro_poster" point the site at them. Make the videos again after the site or the data change.
# Scenes follow each other with a short cross-fade; H.264 + AAC with faststart, so phones and messengers play it.
set -e
cd "$(dirname "$0")/../.."
LANG_SITE=${1:-en}
WORK=tmp/promo
FRAMES=$WORK/frames-$LANG_SITE
OUT=site-media/intro-$LANG_SITE.mp4
SCENES="title card line branches map docs finds book days help me end"
FADE=0.5
MUSIC=${MUSIC:-scripts/promo/music.m4a}
mkdir -p "$WORK/clips-$LANG_SITE" site-media
[ -n "$NORECORD" ] || LANG_SITE=$LANG_SITE node scripts/promo/record.cjs "$FRAMES"

# Each scene: its frames at their own times, made into an even 30 frames a second. The list already holds one
# entry per video frame (a still frame repeats), since the concat demuxer is unreliable with the last duration.
inputs="" ; filter="" ; offset=0 ; i=0 ; prev="[0:v]"
for s in $SCENES; do
  dir="$FRAMES/$s"
  clip="$WORK/clips-$LANG_SITE/$s.mp4"
  awk 'BEGIN {print "ffconcat version 1.0"} {t += $2; while (n / 30 < t) {print "file " $1 "\nduration 0.0333333"; n++}}' "$dir/frames.txt" > "$dir/list.ffconcat"
  ffmpeg -loglevel error -y -f concat -safe 0 -i "$dir/list.ffconcat" -vf "settb=1/30,setpts=N/30/TB,fps=30,scale=1920:1080:flags=lanczos:out_range=tv,format=yuv420p" \
    -c:v libx264 -preset slow -crf 18 "$clip"
  len=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$clip")
  inputs="$inputs -i $clip"
  if [ $i -gt 0 ]; then
    offset=$(echo "$offset + $prevlen - $FADE" | bc -l)
    filter="$filter${prev}[$i:v]xfade=transition=fade:duration=$FADE:offset=$offset[v$i];"
    prev="[v$i]"
  fi
  prevlen=$len ; i=$((i + 1))
done
total=$(echo "$offset + $prevlen" | bc -l)
echo "video: $(printf %.1f "$total") s"

fadeout=$(echo "$total - 3" | bc -l)
# The music: music.m4a (or MUSIC=…), its beginning faded out at the end card; without it, a quiet tune made by music.py.
if [ -f "$MUSIC" ]; then
  audio="$MUSIC" ; afilter="afade=t=in:d=0.5"
else
  audio="$WORK/music.wav" ; afilter="aecho=0.8:0.7:420|780:0.25|0.15,lowpass=f=6000,afade=t=in:d=1.5"
  python3 scripts/promo/music.py "$(echo "$total + 1" | bc -l)" "$audio"
fi
ffmpeg -loglevel error -y $inputs -i "$audio" \
  -filter_complex "${filter%;};[$i:a]atrim=0:$total,$afilter,afade=t=out:st=$fadeout:d=3,loudnorm=I=-18:TP=-2[a]" \
  -map "$prev" -map "[a]" -ar 48000 -c:v libx264 -preset slow -crf 25 -profile:v high -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart "$OUT"
# The poster: the title card, a second in.
ffmpeg -loglevel error -y -ss 1 -i "$OUT" -frames:v 1 -vf scale=1280:-1 -q:v 3 "${OUT%.mp4}.jpg"
ls -lh "$OUT" "${OUT%.mp4}.jpg"
