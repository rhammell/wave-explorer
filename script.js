// Configuration
const X_MIN = 0;
const X_MAX = 4 * Math.PI;
const POINTS = 300; // Resolution of the line
const MARGIN = { top: 30, right: 40, bottom: 30, left: 50 };

// State
let waves = [];
let nextId = 1;

// Colors for waves
const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98FB98', 
    '#DDA0DD', '#F0E68C', '#87CEFA'
];

// Presets
const PRESETS = {
    square: {
        name: "Square Wave",
        // Sum of odd harmonics: sin(x) + sin(3x)/3 + sin(5x)/5 + ...
        generate: () => [
            { amplitude: 1.0, frequency: 1.0, phase: 0 },
            { amplitude: 1/3, frequency: 3.0, phase: 0 },
            { amplitude: 1/5, frequency: 5.0, phase: 0 },
            { amplitude: 1/7, frequency: 7.0, phase: 0 }
        ]
    },
    sawtooth: {
        name: "Sawtooth Wave",
        // Sum of all harmonics: sin(x) - sin(2x)/2 + sin(3x)/3 - ...
        // Note: For simplicity here we just do + with phase shift or alternating signs via amplitude
        generate: () => [
            { amplitude: 1.0, frequency: 1.0, phase: 0 },
            { amplitude: 0.5, frequency: 2.0, phase: 0 }, // Simplified, usually alternating signs
            { amplitude: 0.33, frequency: 3.0, phase: 0 },
            { amplitude: 0.25, frequency: 4.0, phase: 0 }
        ]
    },
    triangle: {
        name: "Triangle Wave",
        // Sum of odd harmonics with alternating signs and inverse square amplitudes
        generate: () => [
            { amplitude: 1.0, frequency: 1.0, phase: 0 },
            { amplitude: 1/9, frequency: 3.0, phase: Math.PI }, // Alternating sign via phase shift or negative amp
            { amplitude: 1/25, frequency: 5.0, phase: 0 },
            { amplitude: 1/49, frequency: 7.0, phase: Math.PI }
        ]
    }
};

// Selectors
const mainPlotContainer = d3.select("#plot-container");
const waveList = d3.select("#wave-list");
const presetSelect = document.getElementById("preset-select");

// Initialize
function init() {
    addWave(); // Add one default wave
    
    document.getElementById('add-wave-btn').addEventListener('click', () => {
        addWave();
        resetPresetSelect();
    });
    
    // Preset listener
    presetSelect.addEventListener('change', (e) => {
        const value = e.target.value;
        if (value !== 'custom' && PRESETS[value]) {
            loadPreset(value);
        }
    });

    // Resize observer for responsive chart
    window.addEventListener('resize', () => {
        updateAll();
    });
    
    // Initial draw
    updateAll();
}

function resetPresetSelect() {
    presetSelect.value = 'custom';
}

function clearWaves() {
    waves = [];
    waveList.html("");
    nextId = 1; // Reset numbering when all waves are cleared
    updateAll();
}

function loadPreset(key) {
    clearWaves();
    const config = PRESETS[key];
    if (!config) return;

    const newWaves = config.generate();
    newWaves.forEach(w => {
        addWave(w);
    });
}

function getDimensions(element) {
    if (!element) return { width: 0, height: 0, innerWidth: 0, innerHeight: 0 };
    const rect = element.getBoundingClientRect();
    return {
        width: rect.width,
        height: rect.height,
        innerWidth: Math.max(0, rect.width - MARGIN.left - MARGIN.right),
        innerHeight: Math.max(0, rect.height - MARGIN.top - MARGIN.bottom)
    };
}

function addWave(params = null) {
    const id = nextId++;
    const color = colors[(id - 1) % colors.length];
    
    let wave;
    if (params) {
        wave = { id, color, ...params };
    } else {
        wave = {
            id,
            amplitude: 1.0,
            frequency: 1.0,
            phase: 0.0,
            color
        };
    }
    
    waves.push(wave);
    renderWaveCard(wave);
    updateAll();
}

function removeWave(id) {
    waves = waves.filter(w => w.id !== id);
    d3.select(`#wave-${id}`).remove();
    resetPresetSelect();
    if (waves.length === 0) {
        nextId = 1; // Reset numbering when no waves remain
    }
    updateAll();
}

function renderWaveCard(wave) {
    const card = waveList.append("div")
        .attr("class", "wave-card")
        .attr("id", `wave-${wave.id}`)
        .style("border-left-color", wave.color);

    const header = card.append("div").attr("class", "wave-header");
    
    const title = header.append("div").attr("class", "wave-title");
    title.append("span")
        .attr("class", "wave-color-indicator")
        .style("background-color", wave.color);
    title.append("span").text(`Wave ${wave.id}`);

    header.append("button")
        .attr("class", "remove-btn")
        .html("&times;")
        .attr("title", "Remove Wave")
        .on("click", () => removeWave(wave.id));

    // Controls
    addControl(card, wave, "Amplitude", "amplitude", 0, 5, 0.01);
    addControl(card, wave, "Frequency", "frequency", 0.1, 10, 0.1);
    addControl(card, wave, "Phase", "phase", 0, 2 * Math.PI, 0.1);

    // Preview Plot Container
    card.append("div")
        .attr("id", `preview-${wave.id}`)
        .attr("class", "preview-plot");
        
    updateWavePreview(wave);
}

function addControl(card, wave, label, property, min, max, step) {
    const group = card.append("div").attr("class", "control-group");
    const labelEl = group.append("label");
    labelEl.append("span").text(label);
    const valueDisplay = labelEl.append("span").text(wave[property].toFixed(2));
    
    group.append("input")
        .attr("type", "range")
        .attr("min", min)
        .attr("max", max)
        .attr("step", step)
        .attr("value", wave[property])
        .on("input", function() {
            const val = parseFloat(this.value);
            wave[property] = val;
            valueDisplay.text(val.toFixed(2));
            updateWavePreview(wave);
            resetPresetSelect(); // Changing a value makes it custom
            updateAll();
        });
}

function updateWavePreview(wave) {
    const containerId = `#preview-${wave.id}`;
    const container = d3.select(containerId);
    if (container.empty()) return;
    
    container.html(""); // Clear

    const rect = container.node().getBoundingClientRect();
    const width = rect.width;
    const height = 60; // Fixed height from CSS
    const margin = 5;

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    const xScale = d3.scaleLinear()
        .domain([X_MIN, X_MAX])
        .range([margin, width - margin]);

    // Fixed Y scale for preview to show relative amplitude changes
    const yScale = d3.scaleLinear()
        .domain([-5, 5]) 
        .range([height - margin, margin]);

    const data = d3.range(X_MIN, X_MAX, (X_MAX - X_MIN) / 50).map(x => ({
        x,
        y: wave.amplitude * Math.sin(wave.frequency * x + wave.phase)
    }));

    const line = d3.line()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y));

    svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", wave.color)
        .attr("stroke-width", 2)
        .attr("d", line);
}

function updateAll() {
    const container = document.getElementById('plot-container');
    if (!container) return;
    
    // Clear previous
    mainPlotContainer.html(""); 

    const { width, height, innerWidth, innerHeight } = getDimensions(container);

    const svg = mainPlotContainer.append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    // X Scale
    const xScale = d3.scaleLinear()
        .domain([X_MIN, X_MAX])
        .range([0, innerWidth]);

    // Calculate Data
    const data = d3.range(X_MIN, X_MAX, (X_MAX - X_MIN) / POINTS).map(x => {
        let y = 0;
        waves.forEach(w => {
            y += w.amplitude * Math.sin(w.frequency * x + w.phase);
        });
        return { x, y };
    });

    // Y Scale (Dynamic based on data, with minimum range to prevent flat line looking weird)
    const yMaxData = d3.max(data, d => Math.abs(d.y)) || 0.1;
    // Ensure we have some space
    const yMax = Math.max(yMaxData, 2); 
    
    const yScale = d3.scaleLinear()
        .domain([-yMax * 1.1, yMax * 1.1]) // Add 10% padding
        .range([innerHeight, 0]);

    // Axes
    const xAxis = d3.axisBottom(xScale)
        .tickFormat(d => (d / Math.PI).toFixed(1) + "π");
        
    svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${innerHeight / 2})`) // Center X axis
        .call(xAxis);
    
    svg.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(yScale));

    // Zero line (X axis visual guide if the axis is moved or customized)
    // The axis above is already centered, so that's the zero line.

    // Line Generator
    const line = d3.line()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y))
        .curve(d3.curveMonotoneX);

    // Draw Sum Line
    svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#fff")
        .attr("stroke-width", 3)
        .attr("d", line);
        
    // Legend / Info
    svg.append("text")
        .attr("x", innerWidth - 10)
        .attr("y", 0)
        .attr("text-anchor", "end")
        .attr("fill", "#888")
        .style("font-size", "14px")
        .text(`Superposition of ${waves.length} wave${waves.length !== 1 ? 's' : ''}`);
}

// Start application
init();
