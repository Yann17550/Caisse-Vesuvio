const app = {
    state: { service: 'Midi', ancv: [], checks: [], mypos: [], midiData: null },
    CONFIG: { 
        SCRIPT_URL: "https://script.google.com/macros/s/AKfycbwrcBUs3ubqrkykwD3mlxK2Gu8Lu9IJaVO99c4Eek4WHbPFoFsCsztuRyhYva8EwRpAHQ/exec", 
        DEFAULT_CASH_OFFSET: 134.00 
    },

    init() {
        this.renderCashGrid();
        this.loadFromStorage();
        this.updateServiceUI();
        this.bindEvents();
        this.refreshUI();
        this.showView('view-cards');
    },

    setService(mode) {
        this.state.service = mode;
        this.updateServiceUI();
        this.updateTheme(); // Change les couleurs
        this.refreshUI();
        this.saveToStorage();
    },

    updateServiceUI() {
        const bm = document.getElementById('btn-midi');
        const bs = document.getElementById('btn-soir');
        if (this.state.service === 'Midi') {
            bm.classList.add('active-midi');
            bs.classList.remove('active-soir');
        } else {
            bs.classList.add('active-soir');
            bm.classList.remove('active-midi');
        }
    },

    updateTheme() {
        if (this.state.service === 'Midi') {
            document.body.className = 'theme-midi';
        } else {
            document.body.className = 'theme-soir';
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
            <div class="cash-item">
                <label>${u} €</label>
                <input type="number" data-unit="${u}" class="cash-in" inputmode="numeric">
            </div>
        `).join('');
    },

    addAncv() {
        const val = parseFloat(document.getElementById('ancv-val').value);
        const qty = parseInt(document.getElementById('ancv-qty').value) || 0;
        const type = document.querySelector('input[name="ancv-type"]:checked').value;
        if (qty > 0) { this.state.ancv.push({ val, qty, type }); document.getElementById('ancv-qty').value = ''; this.refreshUI(); }
    },
    removeAncv(idx) { this.state.ancv.splice(idx, 1); this.refreshUI(); },
    
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

    refreshUI() {
        const v = id => parseFloat(document.getElementById(id).value) || 0;
        const txt = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val.toFixed(2); };

        txt('total-cb', (v('cb-contact') + v('cb-sans-contact')));
        txt('total-tr', (v('tr-contact') + v('tr-sans-contact')));
        txt('total-mypos', this.state.mypos.reduce((a, b) => a + b, 0));
        txt('total-checks', this.state.checks.reduce((a, b) => a + b, 0));
        txt('total-ancv-paper', this.state.ancv.filter(i=>i.type==='paper').reduce((a,b)=>a+(b.val*b.qty),0));
        txt('total-ancv-connect', this.state.ancv.filter(i=>i.type==='connect').reduce((a,b)=>a+(b.val*b.qty),0));

        let brut = 0;
        document.querySelectorAll('.cash-in').forEach(i => brut += (parseFloat(i.dataset.unit) * (parseInt(i.value) || 0)));
        txt('total-cash-brut', brut);
        txt('total-cash-net', (brut - v('cash-offset')));

        this.renderRecaps();
        this.saveToStorage();
    },

    renderRecaps() {
        document.getElementById('ancv-recap').innerHTML = this.state.ancv.map((item, idx) => `<div class="list-item"><span>${item.type==='paper'?'Papier':'Connect'} ${item.qty}x${item.val}€</span><button onclick="app.removeAncv(${idx})">❌</button></div>`).join('');
        document.getElementById('checks-recap').innerHTML = this.state.checks.map((amt, idx) => `<div class="list-item"><span>Chèque ${amt.toFixed(2)}€</span><button onclick="app.removeCheck(${idx})">❌</button></div>`).join('');
        document.getElementById('mypos-recap').innerHTML = this.state.mypos.map((amt, idx) => `<div class="list-item"><span>MyPos ${amt.toFixed(2)}€</span><button onclick="app.removeMyPos(${idx})">❌</button></div>`).join('');
    },

    openRecap() {
        const v = id => parseFloat(document.getElementById(id).value) || 0;
        const txt = id => parseFloat(document.getElementById(id).textContent) || 0;

        const raw = {
            service: this.state.service,
            pizzas_e: v('pos-pizzas-e'), pizzas_p: v('pos-pizzas-p'),
            cb: txt('total-cb'), tr: txt('total-tr'), mypos: txt('total-mypos'),
            cashBrut: txt('total-cash-brut'), cashNet: txt('total-cash-net'),
            ancvP: txt('total-ancv-paper'), ancvC: txt('total-ancv-connect'),
            checks: txt('total-checks'),
            tva5: v('tva-5'), tva10: v('tva-10'), tva20: v('tva-20'),
            posCashLogiciel: v('pos-cash')
        };

        let final = { ...raw };
        if (this.state.service === 'Soir' && this.state.midiData) {
            const m = this.state.midiData;
            ['cb','tr','mypos','cashNet','ancvP','ancvC','checks','tva5','tva10','tva20','posCashLogiciel'].forEach(k => {
                final[k] = parseFloat((raw[k] - m[k]).toFixed(2));
            });
        }

        const delta = parseFloat((final.cashNet - final.posCashLogiciel).toFixed(2));
        this.lastExport = { ...final, deltaCash: delta };

        document.getElementById('recap-body').innerHTML = `
            <div class="recap-list-final">
                <div class="recap-row"><span>Service</span> <b>${final.service.toUpperCase()}</b></div>
                <div class="recap-row"><span>Pizzas Emportées</span> <b>${final.pizzas_e}</b></div>
                <div class="recap-row"><span>Pizzas Sur Place</span> <b>${final.pizzas_p}</b></div>
                <hr>
                <div class="recap-row"><span>Cartes Bancaires</span> <b>${final.cb.toFixed(2)}€</b></div>
                <div class="recap-row"><span>Tickets Resto (CB)</span> <b>${final.tr.toFixed(2)}€</b></div>
                <div class="recap-row"><span>ANCV (Papier + Conn.)</span> <b>${(final.ancvP + final.ancvC).toFixed(2)}€</b></div>
                <div class="recap-row"><span>Chèques</span> <b>${final.checks.toFixed(2)}€</b></div>
                <div class="recap-row"><span>MyPos</span> <b>${final.mypos.toFixed(2)}€</b></div>
                <hr>
                <div class="recap-row"><span>Espèces (Ventes)</span> <b>${final.cashNet.toFixed(2)}€</b></div>
                <div class="recap-row" style="background:${delta < 0 ? '#fee2e2' : '#f0fdf4'};">
                    <span>Écart Caisse</span> <b style="color:${delta < 0 ? 'red' : 'green'}">${delta > 0 ? '+' : ''}${delta.toFixed(2)}€</b>
                </div>
                <hr>
                <div class="recap-row" style="font-size:0.85rem;"><span>TVA 5.5%</span> <b>${final.tva5.toFixed(2)}€</b></div>
                <div class="recap-row" style="font-size:0.85rem;"><span>TVA 10%</span> <b>${final.tva10.toFixed(2)}€</b></div>
                <div class="recap-row" style="font-size:0.85rem;"><span>TVA 20%</span> <b>${final.tva20.toFixed(2)}€</b></div>
            </div>
            <button class="btn-primary" style="margin-top:20px;" onclick="app.send()">💾 ARCHIVER LE SERVICE</button>
        `;
        document.getElementById('modal-recap').classList.remove('hidden');
    },

    send() {
        const btn = document.querySelector('#modal-recap .btn-primary');
        btn.disabled = true; btn.innerHTML = "⌛ Envoi...";
        
        const rawToSave = {
            cb: parseFloat(document.getElementById('total-cb').textContent),
            tr: parseFloat(document.getElementById('total-tr').textContent),
            mypos: parseFloat(document.getElementById('total-mypos').textContent),
            cashNet: parseFloat(document.getElementById('total-cash-net').textContent),
            ancvP: parseFloat(document.getElementById('total-ancv-paper').textContent),
            ancvC: parseFloat(document.getElementById('total-ancv-connect').textContent),
            checks: parseFloat(document.getElementById('total-checks').textContent),
            tva5: parseFloat(document.getElementById('tva-5').value) || 0,
            tva10: parseFloat(document.getElementById('tva-10').value) || 0,
            tva20: parseFloat(document.getElementById('tva-20').value) || 0,
            posCashLogiciel: parseFloat(document.getElementById('pos-cash').value) || 0
        };

        fetch(this.CONFIG.SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(this.lastExport) })
        .then(() => {
            if (this.state.service === 'Midi') this.state.midiData = rawToSave;
            else this.state.midiData = null;
            this.resetAll();
            this.closeRecap();
            alert("✅ Archivage réussi !");
            if (this.state.service === 'Midi') this.setService('Soir');
        })
        .catch(() => { alert("❌ Erreur"); btn.disabled = false; });
    },

    resetAll() {
        this.state.ancv = []; this.state.checks = []; this.state.mypos = [];
        document.querySelectorAll('input[type="number"]').forEach(i => { if(i.id !== 'cash-offset') i.value = ''; });
        this.refreshUI();
    },

    closeRecap() { document.getElementById('modal-recap').classList.add('hidden'); },
    saveToStorage() { localStorage.setItem('vesuvio_v6', JSON.stringify(this.state)); },
    loadFromStorage() { const s = JSON.parse(localStorage.getItem('vesuvio_v6')); if(s) { this.state = s; this.updateTheme(); } },
    bindEvents() { document.addEventListener('input', () => this.refreshUI()); }
};
document.addEventListener('DOMContentLoaded', () => app.init());
