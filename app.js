const app = {
    state: { service: 'Midi', ancv: [], checks: [], mypos: [], midiData: null },
    CONFIG: {
        SCRIPT_URL: "TON_URL_SCRIPT_ICI",
        DEFAULT_CASH_OFFSET: 134.00,
        IDEAL_CASH: { 20:2, 10:4, 5:4, 2:10, 1:10, 0.5:5, 0.2:5, 0.1:5 }
    },

    init() {
        this.renderCashGrid();
        this.loadFromStorage();
        this.updateServiceUI();
        this.bindEvents();
        this.refreshUI();
    },

    setService(mode) {
        this.state.service = mode;
        this.updateServiceUI();
        this.refreshUI();
        this.saveToStorage();
    },

    updateServiceUI() {
        const bm = document.getElementById('btn-midi');
        const bs = document.getElementById('btn-soir');
        if (this.state.service === 'Midi') {
            bm.style.background = "#f1c40f"; bm.style.color = "#000";
            bs.style.background = "#333"; bs.style.color = "#fff";
        } else {
            bs.style.background = "#3498db"; bs.style.color = "#fff";
            bm.style.background = "#333"; bm.style.color = "#fff";
        }
    },

    showView(id) {
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
        window.scrollTo(0,0);
    },

    renderCashGrid() {
        const units = [100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1];
        const container = document.getElementById('cash-container');
        container.innerHTML = units.map(u => `
            <div class="cash-item" style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <label>${u}€</label>
                <input type="number" data-unit="${u}" class="cash-in" inputmode="numeric" style="width:80px;">
            </div>
        `).join('');
    },

    // --- LOGIQUE LISTES ---
    addAncv() {
        const val = parseFloat(document.getElementById('ancv-val').value);
        const qty = parseInt(document.getElementById('ancv-qty').value) || 0;
        const type = document.querySelector('input[name="ancv-type"]:checked').value;
        if (qty > 0) { this.state.ancv.push({ val, qty, type }); document.getElementById('ancv-qty').value = ''; this.refreshUI(); }
    },
    removeAncv(idx) { this.state.ancv.splice(idx, 1); this.refreshUI(); },
    resetAncvInputs() { document.getElementById('ancv-qty').value = ''; },

    addCheck() {
        const amt = parseFloat(document.getElementById('check-amount').value) || 0;
        if (amt > 0) { this.state.checks.push(amt); document.getElementById('check-amount').value = ''; this.refreshUI(); }
    },
    removeCheck(idx) { this.state.checks.splice(idx, 1); this.refreshUI(); },

    addMyPos() {
        const amt = parseFloat(document.getElementById('mypos-amount').value) || 0;
        if (amt > 0) { this.state.mypos.push(amt); document.getElementById('mypos-amount').value = ''; this.refreshUI(); }
    },
    removeMyPos(idx) { this.state.mypos.splice(idx, 1); this.refreshUI(); },

    // --- CALCULS ---
    refreshUI() {
        const v = id => parseFloat(document.getElementById(id).value) || 0;
        document.getElementById('total-cb').textContent = (v('cb-contact') + v('cb-sans-contact')).toFixed(2);
        document.getElementById('total-tr').textContent = (v('tr-contact') + v('tr-sans-contact')).toFixed(2);
        document.getElementById('total-mypos').textContent = this.state.mypos.reduce((a, b) => a + b, 0).toFixed(2);
        document.getElementById('total-checks').textContent = this.state.checks.reduce((a, b) => a + b, 0).toFixed(2);
        document.getElementById('total-ancv-paper').textContent = this.state.ancv.filter(i=>i.type==='paper').reduce((a,b)=>a+(b.val*b.qty),0).toFixed(2);
        document.getElementById('total-ancv-connect').textContent = this.state.ancv.filter(i=>i.type==='connect').reduce((a,b)=>a+(b.val*b.qty),0).toFixed(2);

        let brut = 0;
        document.querySelectorAll('.cash-in').forEach(i => brut += (parseFloat(i.dataset.unit) * (parseInt(i.value) || 0)));
        const net = brut - v('cash-offset');
        document.getElementById('total-cash-net').textContent = net.toFixed(2);

        this.renderRecaps();
        this.saveToStorage();
    },

    renderRecaps() {
        document.getElementById('ancv-recap').innerHTML = this.state.ancv.map((item, idx) => `<div class="recap-item"><span>${item.type==='paper'?'📄':'📱'} ${item.qty}x${item.val}€</span><button onclick="app.removeAncv(${idx})">❌</button></div>`).join('');
        document.getElementById('checks-recap').innerHTML = this.state.checks.map((amt, idx) => `<div class="recap-item"><span>${amt}€</span><button onclick="app.removeCheck(${idx})">❌</button></div>`).join('');
        document.getElementById('mypos-recap').innerHTML = this.state.mypos.map((amt, idx) => `<div class="recap-item"><span>${amt}€</span><button onclick="app.removeMyPos(${idx})">❌</button></div>`).join('');
    },

    // --- ENVOI ---
    openRecap() {
        const v = id => parseFloat(document.getElementById(id).value) || 0;
        const txt = id => parseFloat(document.getElementById(id).textContent) || 0;

        const current = {
            service: this.state.service,
            pizzas_e: v('pos-pizzas-e'),
            pizzas_p: v('pos-pizzas-p'),
            cb: txt('total-cb'),
            tr: txt('total-tr'),
            mypos: txt('total-mypos'),
            cashNet: txt('total-cash-net'),
            ancvP: txt('total-ancv-paper'),
            ancvC: txt('total-ancv-connect'),
            checks: txt('total-checks'),
            tva5: v('tva-5'), tva10: v('tva-10'), tva20: v('tva-20')
        };

        let dataFinal = { ...current };
        if (this.state.service === 'Soir' && this.state.midiData) {
            const m = this.state.midiData;
            ['cb','tr','mypos','cashNet','ancvP','ancvC','checks','tva5','tva10','tva20'].forEach(k => dataFinal[k] -= m[k]);
        }

        this.lastExport = dataFinal;
        document.getElementById('recap-body').innerHTML = `<p>Service : ${dataFinal.service}</p><p>Total Net : ${(dataFinal.cb + dataFinal.cashNet).toFixed(2)}€</p><button class="btn-primary" onclick="app.send()">ARCHIVER</button>`;
        document.getElementById('modal-recap').classList.remove('hidden');
    },

    send() {
        fetch(this.CONFIG.SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(this.lastExport) })
        .then(() => {
            if (this.state.service === 'Midi') this.state.midiData = { ...this.lastExport };
            else this.state.midiData = null;
            this.resetAll();
            this.closeRecap();
            alert("Enregistré !");
            if (this.state.service === 'Midi') this.setService('Soir');
        });
    },

    resetAll() {
        this.state.ancv = []; this.state.checks = []; this.state.mypos = [];
        document.querySelectorAll('input[type="number"]').forEach(i => { if(i.id !== 'cash-offset') i.value = ''; });
        this.refreshUI();
    },

    closeRecap() { document.getElementById('modal-recap').classList.add('hidden'); },
    saveToStorage() { localStorage.setItem('vesuvio_v1', JSON.stringify(this.state)); },
    loadFromStorage() { const s = JSON.parse(localStorage.getItem('vesuvio_v1')); if(s) this.state = s; },
    bindEvents() { document.addEventListener('input', () => this.refreshUI()); }
};
document.addEventListener('DOMContentLoaded', () => app.init());
