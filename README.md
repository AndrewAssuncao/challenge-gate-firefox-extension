# Challenge Gate

Challenge Gate is a Firefox extension that blocks distracting websites until you complete a typing or Python challenge.

## Features

- Block specific sites and force a challenge before access
- Choose typing, Python, or mixed challenges per site
- Track daily usage and enforce daily time caps
- Protect settings behind an additional challenge
- Use the built-in local Python problem bank, or add your own Anthropic API key for AI-generated mentor challenges

## Install

1. Download or clone this repository.
2. Open Firefox and go to `about:debugging`.
3. Click `This Firefox`.
4. Click `Load Temporary Add-on...`.
5. Select `manifest.json`.

## Configure

1. Open the extension popup.
2. Click `Dashboard`.
3. Add the sites you want to block.
4. If you want AI-generated Python mentor challenges, open `Settings` and paste your own Anthropic API key.

If no API key is configured, the extension still works and falls back to the local Python problem set.

## Privacy

- No API key is included in this repository.
- If you enter an Anthropic API key, it is stored locally in Firefox extension storage on your machine.

## Project Structure

- `manifest.json`: Firefox extension manifest
- `background/background.js`: blocking, usage tracking, and API relay
- `dashboard/dashboard.html`: main configuration UI
- `gate/`: typing and Python challenge flows
- `popup/`: quick controls

## License

MIT
