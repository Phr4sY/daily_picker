export class WheelOfFortune {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.names = [];
        this.weights = [];
        this.colors = ['#004e5a', '#1b616d', '#006d7e', '#2d7a89', '#00576a', '#1a5560', '#3a8f9d', '#005f6f'];
        this.startAngle = 0;
        this.isSpinning = false;
        this.spinTimeout = null;
        this.spinAngleStart = 0;
        this.spinTime = 0;
        this.spinTimeTotal = 0;
        this.cfLogo = null;
        this.onWin = null;

        this.googleChatEnabled = false;
        this.webhookUrl = '';

        this.loadLogo();
        this.setupResizeHandler();
    }

    setupResizeHandler() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.resizeCanvas();
                this.drawWheel();
            }, 100);
        });
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const size = Math.min(container.clientWidth, container.clientHeight);
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = size * dpr;
        this.canvas.height = size * dpr;
        this.canvas.style.width = size + 'px';
        this.canvas.style.height = size + 'px';
        this.ctx.scale(dpr, dpr);
        this.displaySize = size;
    }

    loadLogo() {
        this.cfLogo = new Image();
        this.cfLogo.onload = () => this.drawWheel();
        this.cfLogo.src = 'center-logo.png';
    }

    getSecureRandom(min, max) {
        const randomBuffer = new Uint32Array(1);
        window.crypto.getRandomValues(randomBuffer);
        return min + (randomBuffer[0] / (0xFFFFFFFF + 1)) * (max - min);
    }

    /** Compute arc angles proportional to weights. */
    computeArcs() {
        const totalWeight = this.weights.reduce((sum, w) => sum + w, 0);
        return this.weights.map(w => (w / totalWeight) * 2 * Math.PI);
    }

    async loadConfig() {
        const response = await fetch('config.yaml?t=' + Date.now());
        const text = await response.text();
        this.parseConfig(text);
        this.weights = this.names.map(() => 1);
        this.startAngle = this.getSecureRandom(0, 2 * Math.PI);
        this.resizeCanvas();
        this.drawWheel();
    }

    parseConfig(yamlText) {
        const lines = yamlText.split('\n');
        let inMembers = false;

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed === 'members:') { inMembers = true; continue; }
            if (trimmed.startsWith('googleChat:')) { inMembers = false; continue; }
            if (inMembers && trimmed.startsWith('- ')) {
                const name = trimmed.substring(2).trim();
                if (name) this.names.push(name);
            }
            if (trimmed.startsWith('enabled:')) {
                this.googleChatEnabled = trimmed.includes('true');
            }
            if (trimmed.startsWith('webhookUrl:')) {
                this.webhookUrl = trimmed.substring(11).trim().replace(/^["']|["']$/g, '');
            }
        }
    }

    setWeights(weights) {
        this.weights = weights;
    }

    drawWheel() {
        const arcs = this.computeArcs();
        const size = this.displaySize || 600;
        const centerX = size / 2;
        const centerY = size / 2;
        const radius = size / 2 - 10;

        this.ctx.clearRect(0, 0, size, size);

        let currentAngle = this.startAngle;
        for (let i = 0; i < this.names.length; i++) {
            const arc = arcs[i];

            // Segment
            this.ctx.fillStyle = this.colors[i % this.colors.length];
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + arc, false);
            this.ctx.lineTo(centerX, centerY);
            this.ctx.fill();

            // Label
            this.ctx.save();
            this.ctx.fillStyle = '#f8f8f8';
            const fontSize = Math.max(12, Math.floor(size / 33));
            this.ctx.font = `bold ${fontSize}px 'Segoe UI', Arial, sans-serif`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            const textAngle = currentAngle + arc / 2;
            const textRadius = radius * 0.7;
            this.ctx.translate(
                centerX + Math.cos(textAngle) * textRadius,
                centerY + Math.sin(textAngle) * textRadius
            );
            this.ctx.rotate(textAngle + Math.PI / 2);
            this.ctx.fillText(this.names[i], 0, 0);
            this.ctx.restore();

            currentAngle += arc;
        }

        // Outer ring
        this.ctx.strokeStyle = '#f8f8f8';
        this.ctx.lineWidth = Math.max(2, size / 150);
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        this.ctx.stroke();

        // Center circle
        const centerRadius = radius * 0.25;
        this.ctx.fillStyle = '#f8f8f8';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, centerRadius, 0, 2 * Math.PI);
        this.ctx.fill();

        // Logo
        if (this.cfLogo?.complete) {
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, centerRadius * 0.85, 0, 2 * Math.PI);
            this.ctx.clip();
            const logoAspectRatio = this.cfLogo.width / this.cfLogo.height;
            const maxSize = centerRadius * 1.5;
            const [logoWidth, logoHeight] = logoAspectRatio > 1
                ? [maxSize, maxSize / logoAspectRatio]
                : [maxSize * logoAspectRatio, maxSize];
            this.ctx.drawImage(this.cfLogo, centerX - logoWidth / 2, centerY - logoHeight / 2, logoWidth, logoHeight);
            this.ctx.restore();
        }

        // Center ring stroke
        this.ctx.strokeStyle = '#004e5a';
        this.ctx.lineWidth = Math.max(2, size / 200);
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, centerRadius, 0, 2 * Math.PI);
        this.ctx.stroke();
    }

    /** Determine which segment the arrow points to based on current startAngle. */
    getWinnerIndex() {
        const arcs = this.computeArcs();
        // Arrow is at the top (-PI/2). Normalize the angle the arrow points into.
        const pointerAngle = ((-this.startAngle - Math.PI / 2) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);

        let cumulative = 0;
        for (let i = 0; i < arcs.length; i++) {
            cumulative += arcs[i];
            if (pointerAngle < cumulative) return i;
        }
        return 0;
    }

    spin() {
        if (this.isSpinning) return;
        this.isSpinning = true;

        document.querySelector('.wheel-container').classList.remove('shrink');
        document.getElementById('result').innerHTML = '';

        this.spinAngleStart = this.getSecureRandom(40, 70);
        this.spinTime = 0;
        this.spinTimeTotal = this.getSecureRandom(4000, 6000);
        this.rotateWheel();
    }

    rotateWheel() {
        this.spinTime += 30;
        if (this.spinTime >= this.spinTimeTotal) {
            this.stopRotateWheel();
            return;
        }
        const progress = this.spinTime / this.spinTimeTotal;
        const spinAngle = this.spinAngleStart - this.spinAngleStart * (1 - Math.pow(1 - progress, 3.5));
        this.startAngle += (spinAngle * Math.PI) / 180;
        this.drawWheel();
        this.spinTimeout = setTimeout(() => this.rotateWheel(), 30);
    }

    stopRotateWheel() {
        if (this.spinTimeout) clearTimeout(this.spinTimeout);
        const winnerIndex = this.getWinnerIndex();
        const winner = this.names[winnerIndex];
        this.isSpinning = false;
        this.displayResult(winner);
    }

    async postToGoogleChat(winner, date) {
        if (!this.googleChatEnabled || !this.webhookUrl) return;
        try {
            await fetch(this.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json; charset=UTF-8' },
                body: JSON.stringify({ text: `*Next Daily Presenter*\n*${winner}*\n${date}` })
            });
        } catch (e) {
            console.error('Google Chat error:', e);
        }
    }

    getNextWorkingDay() {
        const today = new Date();
        const day = today.getDay();
        const daysToAdd = day === 5 ? 3 : day === 6 ? 2 : 1;
        const nextDay = new Date(today);
        nextDay.setDate(today.getDate() + daysToAdd);
        return nextDay.toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    displayResult(winner) {
        const resultDiv = document.getElementById('result');
        const wheelContainer = document.querySelector('.wheel-container');
        const date = this.getNextWorkingDay();

        wheelContainer.classList.add('shrink');

        resultDiv.innerHTML = `<div class="winner-announcement">
            Next Daily Presenter: <br><strong>${winner}</strong>
            <div style="font-size: 0.6em; margin-top: 10px; color: #1b616d;">${date}</div>
            <div class="confirm-actions">
                <button class="btn-confirm" id="confirm-pick">Confirm</button>
            </div>
        </div>`;

        document.getElementById('confirm-pick').addEventListener('click', () => {
            this.postToGoogleChat(winner, date);
            document.querySelector('.confirm-actions').innerHTML =
                '<div class="confirmed-msg">Confirmed!</div>';
            if (this.onWin) {
                this.onWin(winner);
            }
        });

    }
}
