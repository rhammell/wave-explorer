# wave-explorer
Interactive visualization of wave superposition and interference patterns using D3.js
=======
# Wave Explorer

Interactive visualization of wave superposition and interference patterns using D3.js.

## Features
- Add unlimited sine waves with individual amplitude, frequency, and phase controls.
- Real-time superposition plot with responsive resizing.
- Quick presets to approximate square, sawtooth, and triangle waves via Fourier components.
- Per-wave mini previews and easy removal.

## Getting Started
No build step required.
1) Clone the repo
2) Open `index.html` in your browser (or use a simple static server).

### Serve locally (optional)
```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Controls
- **Add Sine Wave**: Append a new wave to the stack.
- **Sliders**: Adjust amplitude, frequency, and phase; updates are immediate.
- **Presets**: Choose square, sawtooth, or triangle; replaces current waves with preset series. Any manual change switches back to “Custom”.
- **Remove (×)**: Delete an individual wave.

## Tech
- HTML, CSS, JavaScript
- [D3.js v7](https://d3js.org/)

## License
GPL-3.0
