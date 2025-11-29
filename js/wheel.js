class WheelOfFortune {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas with id ${canvasId} not found`);
        }
        this.ctx = this.canvas.getContext('2d');
        this.names = [];
        this.colors = [
            '#1b616d', '#004e5a', '#2d7a89', '#005f6f',
            '#1a5560', '#006d7e', '#2b8799', '#00576a',
            '#1b616d', '#004e5a', '#2d7a89', '#005f6f'
        ];
        this.startAngle = 0;
        this.arc = 0;
        this.spinTimeout = null;
        this.spinAngleStart = 0;
        this.spinTime = 0;
        this.spinTimeTotal = 0;
        this.isSpinning = false;
        this.cfLogo = null;
        this.loadLogo();
    }

    loadLogo() {
        this.cfLogo = new Image();
        this.cfLogo.onload = () => this.drawWheel();
        this.cfLogo.src = 'assets/images/cloudfoundry-logo.png';
    }

    getSecureRandom(min, max) {
        const randomBuffer = new Uint32Array(1);
        window.crypto.getRandomValues(randomBuffer);
        const randomNumber = randomBuffer[0] / (0xFFFFFFFF + 1);
        return min + randomNumber * (max - min);
    }

    async loadConfig() {
        const [membersResponse, googleChatResponse] = await Promise.all([
            fetch('config/members.yaml'),
            fetch('config/google-chat.yaml')
        ]);

        const membersText = await membersResponse.text();
        const googleChatText = await googleChatResponse.text();

        this.names = this.parseMembers(membersText);
        this.googleChatConfig = this.parseGoogleChat(googleChatText);
        this.arc = (2 * Math.PI) / this.names.length;
        this.startAngle = this.getSecureRandom(0, 2 * Math.PI);
        this.drawWheel();
    }

    parseMembers(yamlText) {
        const members = [];
        const lines = yamlText.split('\n');

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('- ')) {
                const name = trimmedLine.substring(2).trim();
                if (name) members.push(name);
            }
        }

        return members;
    }

    parseGoogleChat(yamlText) {
        const lines = yamlText.split('\n');
        let enabled = false;
        let webhookUrl = '';

        for (const line of lines) {
            const trimmedLine = line.trim();

            if (trimmedLine.startsWith('enabled:')) {
                enabled = trimmedLine.includes('true');
            } else if (trimmedLine.startsWith('webhookUrl:')) {
                const urlMatch = trimmedLine.match(/webhookUrl:\s*["']?([^"'\s]+)["']?/);
                if (urlMatch && urlMatch[1]) webhookUrl = urlMatch[1];
            }
        }

        return { enabled, webhookUrl };
    }

    drawWheel() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = this.canvas.width / 2 - 10;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (let i = 0; i < this.names.length; i++) {
            const angle = this.startAngle + i * this.arc;

            this.ctx.fillStyle = this.colors[i % this.colors.length];
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, radius, angle, angle + this.arc, false);
            this.ctx.lineTo(centerX, centerY);
            this.ctx.fill();

            this.ctx.save();
            this.ctx.fillStyle = '#f8f8f8';
            this.ctx.font = 'bold 18px MuseoSans, Arial, sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            const textAngle = angle + this.arc / 2;
            const textRadius = radius * 0.7;
            const textX = centerX + Math.cos(textAngle) * textRadius;
            const textY = centerY + Math.sin(textAngle) * textRadius;

            this.ctx.translate(textX, textY);
            this.ctx.rotate(textAngle + Math.PI / 2);
            this.ctx.fillText(this.names[i], 0, 0);
            this.ctx.restore();
        }

        this.ctx.strokeStyle = '#f8f8f8';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        this.ctx.stroke();

        const centerRadius = radius * 0.25;

        this.ctx.fillStyle = '#f8f8f8';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, centerRadius, 0, 2 * Math.PI);
        this.ctx.fill();

        if (this.cfLogo && this.cfLogo.complete) {
            this.ctx.save();

            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, centerRadius * 0.85, 0, 2 * Math.PI);
            this.ctx.clip();

            const logoAspectRatio = this.cfLogo.width / this.cfLogo.height;
            const maxLogoWidth = centerRadius * 1.5;
            const maxLogoHeight = centerRadius * 1.5;

            let logoWidth, logoHeight;
            if (logoAspectRatio > 1) {
                logoWidth = maxLogoWidth;
                logoHeight = maxLogoWidth / logoAspectRatio;
            } else {
                logoHeight = maxLogoHeight;
                logoWidth = maxLogoHeight * logoAspectRatio;
            }

            const logoX = centerX - logoWidth / 2;
            const logoY = centerY - logoHeight / 2;

            this.ctx.drawImage(this.cfLogo, logoX, logoY, logoWidth, logoHeight);
            this.ctx.restore();
        }

        this.ctx.strokeStyle = '#004e5a';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, centerRadius, 0, 2 * Math.PI);
        this.ctx.stroke();
    }

    rouletteEasing(t, b, c, d) {
        const progress = t / d;
        const easeValue = 1 - Math.pow(1 - progress, 3.5);
        return b + c * easeValue;
    }

    rotateWheel() {
        this.spinTime += 30;
        if (this.spinTime >= this.spinTimeTotal) {
            this.stopRotateWheel();
            return;
        }

        const spinAngle = this.spinAngleStart - this.rouletteEasing(
            this.spinTime,
            0,
            this.spinAngleStart,
            this.spinTimeTotal
        );

        this.startAngle += (spinAngle * Math.PI) / 180;
        this.drawWheel();
        this.spinTimeout = setTimeout(() => this.rotateWheel(), 30);
    }

    stopRotateWheel() {
        if (this.spinTimeout) clearTimeout(this.spinTimeout);

        const degrees = (this.startAngle * 180) / Math.PI + 90;
        const arcd = (this.arc * 180) / Math.PI;
        const index = Math.floor((360 - (degrees % 360)) / arcd);
        const winner = this.names[index % this.names.length];

        this.isSpinning = false;
        this.displayResult(winner);
    }

    async postToGoogleChat(winner, presentationDate) {
        if (!this.googleChatConfig.enabled || !this.googleChatConfig.webhookUrl) return;

        try {
            const message = { text: `🎉 *Next Daily Presenter*\n*${winner}*\n📅 ${presentationDate}` };
            const response = await fetch(this.googleChatConfig.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json; charset=UTF-8' },
                body: JSON.stringify(message)
            });

            if (!response.ok) {
                console.error('Failed to post to Google Chat:', response.statusText);
            }
        } catch (error) {
            console.error('Error posting to Google Chat:', error);
        }
    }

    getNextWorkingDay() {
        const today = new Date();
        const dayOfWeek = today.getDay();
        let daysToAdd = 1;

        if (dayOfWeek === 5) {
            daysToAdd = 3;
        } else if (dayOfWeek === 6) {
            daysToAdd = 2;
        }

        const nextDay = new Date(today);
        nextDay.setDate(today.getDate() + daysToAdd);

        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return nextDay.toLocaleDateString('en-US', options);
    }

    displayResult(winner) {
        const resultDiv = document.getElementById('result');
        const wheelContainer = document.querySelector('.wheel-container');
        const canvas = document.getElementById('wheel');
        const container = document.querySelector('.container');
        const presentationDate = this.getNextWorkingDay();

        container.classList.add('shrink');
        wheelContainer.classList.add('shrink');
        canvas.classList.add('shrink');

        resultDiv.innerHTML = `
            <div class="winner-announcement">
                Next Daily Presenter: <br>
                🎉 <strong>${winner}</strong> 🎉<br>
                <div style="font-size: 0.6em; margin-top: 10px; color: #1b616d;">${presentationDate}</div>
            </div>
        `;
        resultDiv.classList.add('show');

        this.postToGoogleChat(winner, presentationDate);
    }

    spin() {
        if (this.isSpinning) return;

        this.isSpinning = true;

        const resultDiv = document.getElementById('result');
        const wheelContainer = document.querySelector('.wheel-container');
        const canvas = document.getElementById('wheel');
        const container = document.querySelector('.container');

        container.classList.remove('shrink');
        wheelContainer.classList.remove('shrink');
        canvas.classList.remove('shrink');

        resultDiv.classList.remove('show');
        resultDiv.innerHTML = '';

        this.spinAngleStart = this.getSecureRandom(40, 70);
        this.spinTime = 0;
        this.spinTimeTotal = this.getSecureRandom(4000, 6000);
        this.rotateWheel();
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const wheel = new WheelOfFortune('wheel');
    await wheel.loadConfig();

    const canvas = document.getElementById('wheel');
    canvas.style.cursor = 'pointer';
    canvas.addEventListener('click', () => wheel.spin());
});
