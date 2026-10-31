#!/usr/bin/env bash
# Renders each listing asset's HTML to an exact-size PNG via headless Chrome.
# Supersamples then downscales with sips, so vector edges and text stay crisp
# at each store's required pixel dimensions.
#
# Layout (see README.md):
#   icons/   cross-platform icons   (icon.html -> icon{16,32,48,96,128}.png)
#   chrome/  Chrome Web Store assets (promo tiles + 1280x800 screenshots)
#
# Requires: Google Chrome and macOS `sips`.
set -euo pipefail
cd "$(dirname "$0")"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# name  width  height
render() {
	local name=$1 w=$2 h=$3
	"$CHROME" --headless --disable-gpu --hide-scrollbars \
		--force-device-scale-factor=2 --virtual-time-budget=1500 --window-size="$w","$h" \
		--screenshot="$PWD/$name@2x.png" \
		"file://$PWD/$name.html" 2>/dev/null
	sips -z "$h" "$w" "$name@2x.png" --out "$name.png" >/dev/null 2>&1
	rm -f "$name@2x.png"
	printf "%-28s %s\n" "$name.png" "$(sips -g pixelWidth -g pixelHeight "$name.png" | grep -o '[0-9]*' | paste -sd'x' -)"
}

# Chrome Web Store promo tiles.
render chrome/promo-marquee 1400 560
render chrome/promo-small 440 280

# Cross-platform icons: render the source once at 4x, derive every size from it.
"$CHROME" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=4 \
	--default-background-color=00000000 --window-size=128,128 \
	--screenshot="$PWD/icons/_src.png" "file://$PWD/icons/icon.html" 2>/dev/null
for sz in 128 96 48 32 16; do
	sips -z "$sz" "$sz" icons/_src.png --out "icons/icon$sz.png" >/dev/null 2>&1
	printf "%-28s %s\n" "icons/icon$sz.png" "${sz}x${sz}"
done
rm -f icons/_src.png

# Sync the cross-platform icons into the extension's shipping icons/ folder so
# the two never drift. icon.html is the single source of truth for the mark.
cp icons/icon16.png icons/icon32.png icons/icon48.png icons/icon96.png \
   icons/icon128.png ../icons/
printf "%-28s %s\n" "../icons/icon{16..128}.png" "(synced)"

# Chrome Web Store listing screenshots (1280x800), one per clone target.
for v in vscode cursor windsurf zip popup; do
	"$CHROME" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=2 \
		--virtual-time-budget=1500 --window-size=1280,800 \
		--screenshot="$PWD/chrome/_sc@2x.png" "file://$PWD/chrome/screenshot.html?v=$v" 2>/dev/null
	sips -z 800 1280 chrome/_sc@2x.png --out "chrome/screenshot-$v.png" >/dev/null 2>&1
	rm -f chrome/_sc@2x.png
	printf "%-28s %s\n" "chrome/screenshot-$v.png" "1280x800"
done
