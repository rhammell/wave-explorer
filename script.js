// Configuration
const CONFIG = {
    X_MIN: 0,
    X_MAX: 4 * Math.PI,
    POINTS: 300,
    PREVIEW_POINTS: 200,
    MARGIN: { top: 30, right: 50, bottom: 30, left: 50 },
    PREVIEW_INSET: 10,
    PREVIEW_Y_MARGIN: 5,
    PI_SYM: 'π'
};

// State Management
const state = {
    waves: [],
    nextId: 1,
    colors: [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98FB98', 
        '#DDA0DD', '#F0E68C', '#87CEFA'
    ]
};

// Math Helpers
const WaveMath = {
    calcY: (wave, x) => wave.amplitude * Math.sin(wave.frequency * x + wave.phase),
    
    generatePoints: (waveList, numPoints) => {
        return d3.range(numPoints).map(i => {
            const t = i / (numPoints - 1);
            const x = CONFIG.X_MIN + t * (CONFIG.X_MAX - CONFIG.X_MIN);
            let y = 0;
            waveList.forEach(w => {
                y += WaveMath.calcY(w, x);
            });
            return { x, y };
        });
    }
};

// Presets
const PRESETS = {
    square: {
        name: "Square Wave",
        generate: () => [
            { amplitude: 1.0, frequency: 1.0, phase: 0 },
            { amplitude: 1/3, frequency: 3.0, phase: 0 },
            { amplitude: 1/5, frequency: 5.0, phase: 0 },
            { amplitude: 1/7, frequency: 7.0, phase: 0 }
        ]
    },
    sawtooth: {
        name: "Sawtooth Wave",
        generate: () => [
            { amplitude: 1.0, frequency: 1.0, phase: 0 },
            { amplitude: 0.5, frequency: 2.0, phase: 0 },
            { amplitude: 0.33, frequency: 3.0, phase: 0 },
            { amplitude: 0.25, frequency: 4.0, phase: 0 }
        ]
    },
    triangle: {
        name: "Triangle Wave",
        generate: () => [
            { amplitude: 1.0, frequency: 1.0, phase: 0 },
            { amplitude: 1/9, frequency: 3.0, phase: Math.PI },
            { amplitude: 1/25, frequency: 5.0, phase: 0 },
            { amplitude: 1/49, frequency: 7.0, phase: Math.PI }
        ]
    }
};

// DOM Selectors
const selectors = {
    mainPlot: d3.select("#plot-container"),
    waveList: d3.select("#wave-list"),
    presetSelect: document.getElementById("preset-select"),
    addBtn: document.getElementById('add-wave-btn')
};

// Initialization
function init() {
    addWave();
    
    selectors.addBtn.addEventListener('click', () => {
        addWave();
        resetPresetSelect();
    });
    
    selectors.presetSelect.addEventListener('change', (e) => {
        const value = e.target.value;
        if (value !== 'custom' && PRESETS[value]) {
            loadPreset(value);
        }
    });

    window.addEventListener('resize', render);
    render();
}

function render() {
    updateMainPlot();
    updateAllPreviews();
}

// State Actions
function addWave(params = null) {
    const id = state.nextId++;
    const color = state.colors[(id - 1) % state.colors.length];
    
    const wave = params 
        ? { id, color, ...params }
        : { id, color, amplitude: 1.0, frequency: 1.0, phase: 0.0 };
    
    state.waves.push(wave);
    createWaveCard(wave);
    render();
}

function removeWave(id) {
    state.waves = state.waves.filter(w => w.id !== id);
    d3.select(`#wave-${id}`).remove();
    if (state.waves.length === 0) state.nextId = 1;
    resetPresetSelect();
    render();
}

function loadPreset(key) {
    state.waves = [];
    state.nextId = 1;
    selectors.waveList.html("");
    
    const newWaves = PRESETS[key].generate();
    newWaves.forEach(w => addWave(w));
}

function resetPresetSelect() {
    selectors.presetSelect.value = 'custom';
}

// Visualization Utilities
function getInnerDimensions(element, margin) {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const borderX = parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
    const borderY = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    const w = rect.width - borderX;
    const h = rect.height - borderY;
    
    return {
        width: w,
        height: h,
        innerWidth: Math.max(0, w - (margin.left || 0) - (margin.right || 0)),
        innerHeight: Math.max(0, h - (margin.top || 0) - (margin.bottom || 0))
    };
}

function drawLine(container, data, xScale, yScale, color, strokeWidth = 2) {
    const line = d3.line()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y))
        .curve(d3.curveMonotoneX);

    container.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", strokeWidth)
        .attr("d", line);
}

// Rendering Logic
function createWaveCard(wave) {
    const card = selectors.waveList.append("div")
        .attr("class", "wave-card")
        .attr("id", `wave-${wave.id}`)
        .style("border-left-color", wave.color);

    const header = card.append("div").attr("class", "wave-header");
    const title = header.append("div").attr("class", "wave-title");
    title.append("span").attr("class", "wave-color-indicator").style("background-color", wave.color);
    title.append("span").text(`Wave ${wave.id}`);

    header.append("button")
        .attr("class", "remove-btn")
        .html("&times;")
        .on("click", () => removeWave(wave.id));

    addControl(card, wave, "Amplitude", "amplitude", 0, 5, 0.01);
    addControl(card, wave, "Frequency", "frequency", 0.1, 10, 0.1);
    // Phase: 0 to 2π with 0.01π increments. Added small epsilon to max to ensure 2.00π is reachable.
    addControl(card, wave, "Phase", "phase", 0, 2 * Math.PI + 0.001, Math.PI / 100);

    card.append("div").attr("id", `preview-${wave.id}`).attr("class", "preview-plot");
    updateWavePreview(wave);
}

function addControl(card, wave, label, prop, min, max, step) {
    const group = card.append("div").attr("class", "control-group");
    const labelEl = group.append("label");
    labelEl.append("span").text(label);
    
    const format = (v) => prop === "phase" ? (v / Math.PI).toFixed(2) + CONFIG.PI_SYM : v.toFixed(2);
    const display = labelEl.append("span").text(format(wave[prop]));
    
    group.append("input")
        .attr("type", "range")
        .attr("min", min).attr("max", max).attr("step", step)
        .attr("value", wave[prop])
        .on("input", function() {
            let val = parseFloat(this.value);
            // Clamp phase to exactly 2π if it goes slightly over due to epsilon
            if (prop === "phase" && val > 2 * Math.PI) val = 2 * Math.PI;
            
            wave[prop] = val;
            display.text(format(wave[prop]));
            updateWavePreview(wave);
            resetPresetSelect();
            updateMainPlot();
        });
}

function updateWavePreview(wave) {
    const container = d3.select(`#preview-${wave.id}`);
    if (container.empty()) return;
    container.html("");

    const dims = getInnerDimensions(container.node(), { left: CONFIG.PREVIEW_INSET, right: CONFIG.PREVIEW_INSET, top: CONFIG.PREVIEW_Y_MARGIN, bottom: CONFIG.PREVIEW_Y_MARGIN });
    if (dims.width <= 0) return;

    const svg = container.append("svg").attr("width", dims.width).attr("height", dims.height);
    const xScale = d3.scaleLinear().domain([CONFIG.X_MIN, CONFIG.X_MAX]).range([CONFIG.PREVIEW_INSET, dims.width - CONFIG.PREVIEW_INSET]);
    const yScale = d3.scaleLinear().domain([-5, 5]).range([dims.height - CONFIG.PREVIEW_Y_MARGIN, CONFIG.PREVIEW_Y_MARGIN]);

    drawLine(svg, WaveMath.generatePoints([wave], CONFIG.PREVIEW_POINTS), xScale, yScale, wave.color);
}

function updateAllPreviews() {
    state.waves.forEach(updateWavePreview);
}

function updateMainPlot() {
    const container = document.getElementById('plot-container');
    if (!container) return;
    selectors.mainPlot.html("");

    const dims = getInnerDimensions(container, CONFIG.MARGIN);
    const svg = selectors.mainPlot.append("svg").attr("width", dims.width).attr("height", dims.height)
        .append("g").attr("transform", `translate(${CONFIG.MARGIN.left},${CONFIG.MARGIN.top})`);

    const xScale = d3.scaleLinear().domain([CONFIG.X_MIN, CONFIG.X_MAX]).range([0, dims.innerWidth]);
    const data = WaveMath.generatePoints(state.waves, CONFIG.POINTS);
    const yMax = Math.max(d3.max(data, d => Math.abs(d.y)) || 0.1, 2);
    const yScale = d3.scaleLinear().domain([-yMax * 1.1, yMax * 1.1]).range([dims.innerHeight, 0]);

    // Axes
    const ticks = d3.range(CONFIG.X_MIN, CONFIG.X_MAX + Math.PI / 4, Math.PI / 2);
    const xAxis = d3.axisBottom(xScale).tickValues(ticks).tickFormat(d => (d / Math.PI).toFixed(1) + CONFIG.PI_SYM);
    
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${dims.innerHeight / 2})`).call(xAxis);
    svg.append("g").attr("class", "axis").call(d3.axisLeft(yScale));

    drawLine(svg, data, xScale, yScale, "#fff", 3);

    svg.append("text").attr("x", dims.innerWidth - 10).attr("y", 0).attr("text-anchor", "end").attr("fill", "#888")
        .style("font-size", "14px").text(`Superposition of ${state.waves.length} wave${state.waves.length !== 1 ? 's' : ''}`);
}

init();
