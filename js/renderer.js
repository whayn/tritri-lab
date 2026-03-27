class TriTriRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.snakePath = [
            [0, 0], [1, 0], [2, 0], // Left col (down)
            [2, 1], [1, 1], [0, 1], // Middle col (up)
            [0, 2], [1, 2], [2, 2]  // Right col (down)
        ];
    }

    render(syllables, options) {
        const { mode, size, spacing, lineheight, tension, weight, color, steps, alpha, degree, showDots, showPath, showGrid, showValues, zoom, panX, panY } = options;
        const scale = size;
        const radius = (scale / 2) * tension;
        
        const glyphWidth = scale * 2;
        const glyphHeight = scale * 2;

        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.translate(panX, panY);
        this.ctx.scale(zoom, zoom);

        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        let currentX = 0;
        let currentY = 0;

        syllables.forEach((syllable, sIdx) => {
            if (syllable === '\n') {
                currentX = 0;
                currentY += lineheight;
                return;
            }
            if (syllable === ' ') {
                currentX += spacing;
                return;
            }

            const bitsStr = SYLLABLES_DATA[syllable] || "111111111";
            const bits = [
                bitsStr[0], bitsStr[1], bitsStr[2], 
                bitsStr[5], bitsStr[4], bitsStr[3], 
                bitsStr[6], bitsStr[7], bitsStr[8]  
            ];

            const xOffset = currentX;
            const yOffset = currentY;

            this.ctx.save();
            this.ctx.translate(xOffset, yOffset);

            const points = this.snakePath.map(p => ({
                x: p[1] * scale,
                y: p[0] * scale,
                col: p[1],
                row: p[0]
            }));

            if (showGrid) this.drawGrid(scale);
            if (showPath) this.drawPath(points);
            
            this.ctx.strokeStyle = color || '#00d2ff';
            this.ctx.lineWidth = weight;
            
            this.ctx.save();
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.font = `${scale / 1.5}px monospace`;
            this.ctx.textAlign = 'center';
            this.ctx.fillText(syllable, scale, scale * 3.5);
            
            if (showValues) {
                const val = parseInt(bitsStr, 2);
                const hex = val.toString(16).toUpperCase().padStart(2, '0');
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                this.ctx.font = `${scale / 2.5}px monospace`;
                this.ctx.fillText(`0x${hex} (${val})`, scale, scale * 4.5);
            }
            this.ctx.restore();

            this.ctx.beginPath();
            if (mode === 'script') {
                this.drawScript(points, bits, radius, scale);
            } else if (mode === 'spline') {
                this.drawSpline(points, bits, radius, steps, alpha);
            } else if (mode === 'bspline') {
                this.drawBSpline(points, bits, radius, steps, degree);
            }
            this.ctx.stroke();

            if (showDots) this.drawDots(points, bits);

            this.ctx.restore();
            currentX += glyphWidth + spacing;
        });
    }

    drawGrid(scale) {
        this.ctx.save();
        this.ctx.strokeStyle = '#222';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 5]);
        for (let i = 0; i <= 2; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * scale, 0);
            this.ctx.lineTo(i * scale, 2 * scale);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * scale);
            this.ctx.lineTo(2 * scale, i * scale);
            this.ctx.stroke();
        }
        this.ctx.restore();
    }

    drawDots(points, bits) {
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; // Clear but subtle
        const fontSize = Math.sqrt((points[1].x - points[0].x)**2 + (points[1].y - points[0].y)**2) * 0.25;
        this.ctx.font = `${fontSize}px monospace`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        points.forEach((p, i) => {
            this.ctx.fillText(bits[i], p.x, p.y);
        });
        this.ctx.restore();
    }

    drawPath(points) {
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'; // Brighter path
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([10, 10]);
        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            this.ctx.lineTo(points[i].x, points[i].y);
        }
        this.ctx.stroke();
        this.ctx.restore();
    }

    drawScript(points, bits, r, scale) {
        const G = { x: scale, y: scale };
        const distSq = (p1, p2) => (p1.x - p2.x)**2 + (p1.y - p2.y)**2;

        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            const isStraight = bits[i] === '1';

            if (i === 0) {
                if (isStraight) {
                    this.ctx.moveTo(p.x, p.y);
                } else {
                    const next = points[1];
                    const angleOut = Math.atan2(next.y - p.y, next.x - p.x);
                    const start1 = angleOut - Math.PI/2;
                    const start2 = angleOut + Math.PI/2;
                    const mid1 = { x: p.x + Math.cos(start1 + Math.PI/4)*r, y: p.y + Math.sin(start1 + Math.PI/4)*r };
                    const mid2 = { x: p.x + Math.cos(start2 - Math.PI/4)*r, y: p.y + Math.sin(start2 - Math.PI/4)*r };
                    const useCCW = distSq(mid1, G) < distSq(mid2, G) + 0.001;
                    this.ctx.arc(p.x, p.y, r, useCCW ? start1 : start2, angleOut, !useCCW);
                }
            } else {
                const prev = points[i-1];
                const next = points[i+1];
                const angleIn = Math.atan2(p.y - prev.y, p.x - prev.x);

                if (isStraight) {
                    this.ctx.lineTo(p.x, p.y);
                } else {
                    const ex = p.x - Math.cos(angleIn) * r;
                    const ey = p.y - Math.sin(angleIn) * r;
                    this.ctx.lineTo(ex, ey);

                    if (next) {
                        const angleOut = Math.atan2(next.y - p.y, next.x - p.x);
                        let sweep1 = angleOut - (angleIn + Math.PI);
                        while(sweep1 <= 0) sweep1 += 2*Math.PI;
                        let sweep2 = angleOut - (angleIn + Math.PI);
                        while(sweep2 >= 0) sweep2 -= 2*Math.PI;
                        const mid1 = { x: p.x + Math.cos(angleIn + Math.PI + sweep1/2)*r, y: p.y + Math.sin(angleIn + Math.PI + sweep1/2)*r };
                        const mid2 = { x: p.x + Math.cos(angleIn + Math.PI + sweep2/2)*r, y: p.y + Math.sin(angleIn + Math.PI + sweep2/2)*r };
                        const useCCW = distSq(mid1, G) <= distSq(mid2, G) + 0.01;
                        this.ctx.arc(p.x, p.y, r, angleIn + Math.PI, angleOut, !useCCW);
                    } else {
                        const end1 = angleIn + Math.PI + Math.PI/2;
                        const end2 = angleIn + Math.PI - Math.PI/2;
                        const mid1 = { x: p.x + Math.cos(angleIn + Math.PI + Math.PI/4)*r, y: p.y + Math.sin(angleIn + Math.PI + Math.PI/4)*r };
                        const mid2 = { x: p.x + Math.cos(angleIn + Math.PI - Math.PI/4)*r, y: p.y + Math.sin(angleIn + Math.PI - Math.PI/4)*r };
                        const useCCW = distSq(mid1, G) < distSq(mid2, G);
                        this.ctx.arc(p.x, p.y, r, angleIn + Math.PI, useCCW ? end1 : end2, !useCCW);
                    }
                }
            }
        }
    }

    drawSpline(points, bits, r, steps, alpha) {
        const G = { x: points[4].x, y: points[4].y };
        const distSq = (p1, p2) => (p1.x - p2.x)**2 + (p1.y - p2.y)**2;

        const knots = points.map((p, i) => {
            if (bits[i] === '1') return { ...p };
            const offsets = [{x:p.x+r,y:p.y},{x:p.x-r,y:p.y},{x:p.x,y:p.y+r},{x:p.x,y:p.y-r}];
            let best = offsets[0], minDist = Infinity;
            offsets.forEach(off => { const d = distSq(off, G); if(d<minDist){minDist=d; best=off;} });
            if(p.x===G.x && p.y===G.y) best={x:p.x-r,y:p.y};
            return best;
        });

        const getPt = (pts, i) => pts[Math.max(0, Math.min(pts.length - 1, i))];
        const fullKnots = [getPt(knots, -1), ...knots, getPt(knots, knots.length)];

        this.ctx.moveTo(knots[0].x, knots[0].y);

        for (let i = 1; i < fullKnots.length - 2; i++) {
            const p0 = fullKnots[i-1], p1 = fullKnots[i], p2 = fullKnots[i+1], p3 = fullKnots[i+2];
            const t0 = 0;
            const t1 = t0 + Math.pow(Math.sqrt(distSq(p0, p1)), alpha) || 1;
            const t2 = t1 + Math.pow(Math.sqrt(distSq(p1, p2)), alpha) || 1;
            const t3 = t2 + Math.pow(Math.sqrt(distSq(p2, p3)), alpha) || 1;

            for (let t = t1; t < t2; t += (t2 - t1) / steps) {
                const a1 = this.lerpPoints(p0, p1, (t1 - t) / (t1 - t0));
                const a2 = this.lerpPoints(p1, p2, (t2 - t) / (t2 - t1));
                const a3 = this.lerpPoints(p2, p3, (t3 - t) / (t3 - t2));
                const b1 = this.lerpPoints(a1, a2, (t2 - t) / (t2 - t0));
                const b2 = this.lerpPoints(a2, a3, (t3 - t) / (t3 - t1));
                const c = this.lerpPoints(b1, b2, (t2 - t) / (t2 - t1));
                this.ctx.lineTo(c.x, c.y);
            }
        }
        this.ctx.lineTo(knots[knots.length-1].x, knots[knots.length-1].y);
    }

    lerpPoints(p1, p2, t) { return { x: p1.x + (p2.x - p1.x) * (1 - t), y: p1.y + (p2.y - p1.y) * (1 - t) }; }

    drawBSpline(points, bits, r, steps, degree) {
        const G = { x: points[4].x, y: points[4].y };
        const distSq = (p1, p2) => (p1.x - p2.x)**2 + (p1.y - p2.y)**2;

        const knots = points.map((p, i) => {
            if (bits[i] === '1') return { ...p };
            const offsets = [{x:p.x+r,y:p.y},{x:p.x-r,y:p.y},{x:p.x,y:p.y+r},{x:p.x,y:p.y-r}];
            let best = offsets[0], minDist = Infinity;
            offsets.forEach(off => { const d = distSq(off, G); if(d<minDist){minDist=d; best=off;} });
            if(p.x===G.x && p.y===G.y) best={x:p.x-r,y:p.y};
            return best;
        });

        const n = knots.length - 1;
        const k = degree;
        const kv = [];
        for (let i = 0; i <= n + k + 1; i++) {
            if (i < k) kv.push(0);
            else if (i <= n + 1) kv.push(i - k);
            else kv.push(n - k + 1);
        }

        this.ctx.moveTo(knots[0].x, knots[0].y);
        const maxT = kv[kv.length - 1];
        for (let t = 0; t <= maxT; t += maxT / (steps * knots.length)) {
            let s;
            for (s = k; s < kv.length - k - 1; s++) { if (t >= kv[s] && t < kv[s+1]) break; }
            if (t >= maxT) s = n;
            const p = this.calculateDeBoor(s, t, k, knots, kv);
            this.ctx.lineTo(p.x, p.y);
        }
    }

    calculateDeBoor(k, t, p, c, u) {
        const d = [];
        for (let j = 0; j <= p; j++) d.push({ ...c[j + k - p] });
        for (let r = 1; r <= p; r++) {
            for (let j = p; j >= r; j--) {
                const alpha = (t - u[j + k - p]) / (u[j + 1 + k - r] - u[j + k - p]) || 0;
                d[j].x = (1 - alpha) * d[j - 1].x + alpha * d[j].x;
                d[j].y = (1 - alpha) * d[j - 1].y + alpha * d[j].y;
            }
        }
        return d[p];
    }
}
