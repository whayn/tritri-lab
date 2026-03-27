document.addEventListener('DOMContentLoaded', () => {
    const renderer = new TriTriRenderer('tritri-canvas');
    
    const inputs = {
        template: document.getElementById('template-select'),
        standard: document.getElementById('standard-input'),
        phonetic: document.getElementById('phonetic-input'),
        size: document.getElementById('slider-size'),
        spacing: document.getElementById('slider-spacing'),
        lineheight: document.getElementById('slider-lineheight'),
        tension: document.getElementById('slider-tension'),
        weight: document.getElementById('slider-weight'),
        color: document.getElementById('slider-color'),
        steps: document.getElementById('slider-steps'),
        alpha: document.getElementById('slider-alpha'),
        degree: document.getElementById('slider-degree'),
        showDots: document.getElementById('toggle-dots'),
        showPath: document.getElementById('toggle-path'),
        showGrid: document.getElementById('toggle-grid'),
        showValues: document.getElementById('toggle-values'),
        showEditor: document.getElementById('toggle-editor'),
        syllableDisplay: document.getElementById('syllable-display'),
        splineOptions: document.getElementById('spline-options'),
        optAlpha: document.getElementById('opt-alpha'),
        optDegree: document.getElementById('opt-degree'),
        fitBtn: document.getElementById('fit-btn'),
        sidebarToggle: document.getElementById('sidebar-toggle')
    };

    // Populate templates
    Object.keys(TRITRI_PRESETS.items).forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = TRITRI_PRESETS.items[key].name;
        inputs.template.appendChild(option);
    });

    // Sidebar Toggle
    inputs.sidebarToggle.addEventListener('click', () => {
        document.body.classList.toggle('collapsed');
        setTimeout(resizeCanvas, 350); // Resize after animation
    });

    let currentMode = 'script';
    const VALID_SYLLABLES = Object.keys(SYLLABLES_DATA).sort((a, b) => b.length - a.length);

    const translateToPhonetic = (text) => {
        if (!text) return "";
        let p = text.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/ou/g, "o")
            .replace(/u/g, "y")
            .replace(/gn/g, "nj")
            .replace(/ch/g, "sh")
            .replace(/oi/g, "wa")
            .replace(/ai/g, "è")
            .replace(/ei/g, "è")
            .replace(/au|eau/g, "o")
            .replace(/en|an/g, "an")
            .replace(/in|im|ain/g, "in")
            .replace(/on/g, "on")
            .replace(/un/g, "un")
            .replace(/eu/g, "eu")
            .replace(/qu/g, "k")
            .replace(/gu/g, "g")
            .replace(/ph/g, "f")
            .replace(/th/g, "t")
            .replace(/c(?=[iey])/g, "s")
            .replace(/c/g, "k")
            .replace(/g(?=[iey])/g, "zh")
            .replace(/j/g, "zh")
            .replace(/s(?=[aeiouyèé])(?<=[aeiouyèé])/g, "z")
            .replace(/x/g, "ks")
            .replace(/y/g, "y")
            .replace(/w/g, "v")
            .replace(/h/g, "");

        let result = [];
        let i = 0;
        while (i < p.length) {
            let found = false;
            if (p[i] === ' ' || p[i] === '\n') {
                result.push(p[i]);
                i++;
                continue;
            }
            for (const s of VALID_SYLLABLES) {
                if (p.startsWith(s, i)) {
                    result.push(s);
                    i += s.length;
                    found = true;
                    break;
                }
            }
            if (!found) i++; 
        }
        return result.map((s, idx) => {
            const next = result[idx + 1];
            if (s === ' ' || s === '\n' || !next || next === ' ' || next === '\n') return s;
            return s + '-';
        }).join('');
    };

    const applyParams = (params) => {
        const merged = { ...TRITRI_PRESETS.defaults, ...params };
        Object.keys(merged).forEach(key => {
            const input = inputs[key] || document.getElementById('slider-' + key);
            if (input) {
                input.value = merged[key];
            }
        });
    };

    let zoomLevel = 1.0;
    let panX = 0;
    let panY = 0;
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    const canvasEl = document.getElementById('tritri-canvas');
    const containerEl = document.getElementById('canvas-container');

    const resizeCanvas = () => {
        const rect = containerEl.getBoundingClientRect();
        canvasEl.width = rect.width;
        canvasEl.height = rect.height;
        draw();
    };

    window.addEventListener('resize', resizeCanvas);
    
    containerEl.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = -e.deltaY;
        const factor = Math.pow(1.2, delta / 100);
        const rect = canvasEl.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const newZoom = Math.max(0.01, Math.min(zoomLevel * factor, 20));
        panX = mouseX - (mouseX - panX) * (newZoom / zoomLevel);
        panY = mouseY - (mouseY - panY) * (newZoom / zoomLevel);
        zoomLevel = newZoom;
        draw();
    }, { passive: false });

    containerEl.addEventListener('mousedown', (e) => {
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        panX += dx;
        panY += dy;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        draw();
    });

    window.addEventListener('mouseup', () => { isDragging = false; });

    const fitToContent = () => {
        const text = inputs.phonetic.value || "";
        const isEditor = inputs.showEditor.classList.contains('active');
        let syllables = text.split(/(-|\n)/).filter(s => s !== '-' && s !== '').flatMap(s => s.split(/( )/)).filter(s => s !== '');
        if (!isEditor) syllables = syllables.filter(s => s !== '\n');

        if (syllables.length === 0) return;

        const size = parseInt(inputs.size.value);
        const spacing = parseInt(inputs.spacing.value);
        const lineheight = parseInt(inputs.lineheight.value);
        const glyphWidth = size * 2;
        const glyphHeight = size * 2;

        let maxX = 0;
        let currentX = 0;
        let currentY = 0;

        syllables.forEach(s => {
            if (s === '\n') {
                maxX = Math.max(maxX, currentX);
                currentX = 0;
                currentY += lineheight;
            } else if (s === ' ') {
                currentX += spacing;
            } else {
                currentX += glyphWidth + spacing;
            }
        });
        maxX = Math.max(maxX, currentX);
        const maxY = currentY + glyphHeight * 1.5;

        const padding = 50;
        const availableWidth = canvasEl.width - padding * 2;
        const availableHeight = canvasEl.height - padding * 2;

        const zoomX = availableWidth / maxX;
        const zoomY = availableHeight / maxY;
        zoomLevel = Math.min(zoomX, zoomY, 3.0);

        panX = (canvasEl.width - maxX * zoomLevel) / 2;
        panY = (canvasEl.height - maxY * zoomLevel) / 2;

        draw();
    };

    inputs.fitBtn.addEventListener('click', fitToContent);

    const updateLabels = () => {
        document.querySelectorAll('label span').forEach(span => {
            const input = document.getElementById(span.id.replace('val-', 'slider-'));
            if (input) {
                if (input.id === 'slider-alpha') span.textContent = (input.value / 100).toFixed(2);
                else if (input.id === 'slider-color') span.textContent = input.value.toUpperCase();
                else span.textContent = input.value;
            }
        });
    };

    const getOptions = () => ({
        mode: currentMode,
        size: parseInt(inputs.size.value),
        spacing: parseInt(inputs.spacing.value),
        lineheight: parseInt(inputs.lineheight.value),
        tension: parseInt(inputs.tension.value) / 100,
        weight: parseInt(inputs.weight.value),
        color: inputs.color.value,
        steps: parseInt(inputs.steps.value),
        alpha: parseInt(inputs.alpha.value) / 100,
        degree: parseInt(inputs.degree.value),
        showDots: inputs.showDots.classList.contains('active'),
        showPath: inputs.showPath.classList.contains('active'),
        showGrid: inputs.showGrid.classList.contains('active'),
        showValues: inputs.showValues.classList.contains('active'),
        showEditor: inputs.showEditor.classList.contains('active'),
        zoom: zoomLevel,
        panX: panX,
        panY: panY
    });

    const draw = () => {
        if (!renderer) return;
        const text = inputs.phonetic.value || "";
        const isEditor = inputs.showEditor.classList.contains('active');
        
        let syllables = text.split(/(-|\n)/)
            .filter(s => s !== '-' && s !== '')
            .flatMap(s => s.split(/( )/))
            .filter(s => s !== '');

        if (!isEditor) {
            syllables = syllables.filter(s => s !== '\n');
        }
        
        inputs.syllableDisplay.innerHTML = syllables.map(s => {
            if (s === '\n') return '<span class="space-token">↵</span>';
            if (s === ' ') return '<span class="space-token">␣</span>';
            const found = SYLLABLES_DATA[s];
            return `<span style="color: ${found ? 'var(--accent)' : '#ff4444'}">${s}</span>`;
        }).join(' ');

        inputs.splineOptions.style.display = (currentMode === 'spline' || currentMode === 'bspline') ? 'block' : 'none';
        inputs.optAlpha.style.display = (currentMode === 'spline') ? 'block' : 'none';
        inputs.optDegree.style.display = (currentMode === 'bspline') ? 'block' : 'none';

        renderer.render(syllables, getOptions());
        updateLabels();
    };

    if (inputs.template) {
        inputs.template.addEventListener('change', () => {
            const preset = TRITRI_PRESETS.items[inputs.template.value];
            if (preset) {
                applyParams(preset.params);
                inputs.standard.value = preset.standard;
                inputs.phonetic.value = preset.phonetic;
                draw();
                setTimeout(fitToContent, 10);
            }
        });
    }

    if (inputs.standard) {
        inputs.standard.addEventListener('input', () => {
            inputs.phonetic.value = translateToPhonetic(inputs.standard.value);
            draw();
        });
    }

    ['phonetic', 'size', 'spacing', 'lineheight', 'tension', 'weight', 'color', 'steps', 'alpha', 'degree'].forEach(id => {
        const el = inputs[id] || document.getElementById('slider-' + id);
        if (el) el.addEventListener('input', draw);
    });

    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.dataset.mode;
            draw();
        });
    });

    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
            draw();
        });
    });

    applyParams({});
    resizeCanvas();
    setTimeout(fitToContent, 100);
});
