/**
 * APP LE VESUVIO - VERSION FINALE (V10)
 * Gère le mode MIDI (Saisie rapide) et CLÔTURE (Comptage complet)
 */
const app = {
    state: {
        service: 'Midi',
        ancv: [],
        checks: [],
        mypos: [],
        midiData: null 
    },
    CONFIG: {
        SCRIPT_URL: "TON_URL_SCRIPT",
        CASH_OFFSET: 134.00
    },

    init() {
        this.renderCashGrid();
        this.loadFromStorage();
        this.setService(this.state.service);
        this.bindEvents();
        this.refreshUI();
    },

    setService(mode) {
        this.state.service = mode;
        this.updateTheme();
        
        const midiView = document.getElementById('view-midi-fast');
        const soirViews = document.getElementById('views-soir-container');
        const soirBtns = document.querySelectorAll('.soir-only');
        const midiBtn = document.getElementById('nav-midi-btn');

        if (mode === 'Midi') {
            midiView.classList.remove('hidden');
            soirViews.classList.add('hidden');
            soirBtns.forEach(b => b.classList.add('hidden'));
            midiBtn.classList.remove('hidden');
        } else {
            midiView.classList.add('hidden');
            soirViews.classList.remove('hidden');
            soirBtns.forEach(b => b.classList.remove('hidden'));
            midiBtn.classList.add('hidden');
            this.showView('view-cards-soir');
        }
        this.saveToStorage();
    },

    updateTheme() {
        document.body.className = (this.state.service === 'Midi') ? 'theme-midi' : 'theme-soir';
        document.getElementById('btn-midi').className = (this.state.service === 'Midi') ? 'active-midi' : '';
        document.getElementById('btn-soir').className = (this.state.service === 'Soir') ? 'active-soir' : '';
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

    addItem(type) {
        if (type === 'mypos') {
            const val = parseFloat(document.getElementById('mypos-amt-soir').value) || 0;
            if (val > 0) this.state.mypos.push(val);
            document.getElementById('mypos-amt-soir').value = '';
        } else if (type === 'checks') {
            const val = parseFloat(document.getElementById('check-amt-soir').value) || 0;
            if (val > 0) this.state.checks.push(val);
            document.getElementById('check-amt-soir').value = '';
        } else if (type === 'ancv') {
            const val = parseFloat(document.getElementById('ancv-val-soir').value);
            const qty = parseInt(document.getElementById('ancv-qty-soir').value) || 0;
            const t = document.querySelector('input[name="ancv-t"]:checked').value;
            if (qty > 0) this.state.ancv.push({ val, qty, type: t });
            document.getElementById('ancv-qty-soir').value = '';
        }
        this.refreshUI();
    },

    removeItem(type, idx) {
        this.state[type].splice(idx, 1);
        this.refreshUI();
    },

    refreshUI() {
        let brut = 0;
        document.querySelectorAll('.cash-in').forEach(i => {
            brut += (parseFloat(i.dataset.unit) * (parseInt(i.value) || 0));
        });
        document.getElementById('cash-brut-soir').textContent = brut.toFixed(2);

        document.getElementById('mypos-recap-soir').innerHTML = this.state.mypos.map((v, i) => `<div class="list-item"><span>MyPos ${v}€</span><button onclick="app.removeItem('mypos', ${i})">❌</button></div>`).join('');
        document.getElementById('checks-recap-soir').innerHTML = this.state.checks.map((v, i) => `<div class="list-item"><span>Chèque ${v}€</span><button onclick="app.removeItem('checks', ${i})">❌</button></div>`).join('');
        document.getElementById('ancv-recap-soir').innerHTML = this.state.ancv.map((v, i) => `<div class="list-item"><span>${v.type} ${v.qty}x${v.val}€</span><button onclick="app.removeItem('ancv', ${i})">❌</button></div>`).join('');

        this.saveToStorage();
    },

    openRecap() {
        const v = id => parseFloat(document.getElementById(id).value) || 0;
        const txt = id => parseFloat(document.getElementById(id).textContent) || 0;
        
        let displayData = {}; 
        let exportData = {};  

        if (this.state.service === 'Midi') {
            displayData = {
                service: 'Midi',
                cb: v('midi-cb'), tr: v('midi-tr'), mypos: v('midi-mypos'),
                cashNet: v('midi-cash'), ancvP: v('midi-ancv'), ancvC: 0,
                checks: v('midi-checks'), pizzas_e: v('midi-piz-e'), pizzas_p: v('midi-piz-p'),
                tva5: v('midi-tva5'), tva10: v('midi-tva10'), tva20: v('midi-tva20'),
                posCashLogiciel: v('midi-cash'), deltaCash: 0
            };
            exportData = { ...displayData };
        } else {
            // COMPTAGE CLÔTURE (CUMUL JOURNÉE POUR COMPARER AU TICKET Z)
            displayData = {
                service: 'Soir',
                cb: v('cb-c-soir') + v('cb-sc-soir'),
                tr: v('tr-c-soir') + v('tr-sc-soir'),
                mypos: this.state.mypos.reduce((a, b) => a + b, 0),
                cashNet: txt('cash-brut-soir') - this.CONFIG.CASH_OFFSET,
                ancvP: this.state.ancv.filter(i => i.type === 'Papier').reduce((a, b) => a + (b.val * b.qty), 0),
                ancvC: this.state.ancv.filter(i => i.type === 'Connect').reduce((a, b) => a + (b.val * b.qty), 0),
                checks: this.state.checks.reduce((a, b) => a + b, 0),
                pizzas_e: v('pos-piz-e-soir'), pizzas_p: v('pos-piz-p-soir'),
                tva5: v('tva5-soir'), tva10: v('tva10-soir'), tva20: v('tva20-soir'),
                posCashLogiciel: v('pos-cash-soir')
            };
            displayData.deltaCash = parseFloat((displayData.cashNet - displayData.posCashLogiciel).toFixed(2));

            exportData = { ...displayData };
            // Soustraction pour la Sheet si un Midi a été archivé
            if (this.state.midiData) {
                const m = this.state.midiData;
                ['cb', 'tr', 'mypos', 'cashNet', 'ancvP', 'ancvC', 'checks', 'tva5', 'tva10', 'tva20', 'posCashLogiciel'].forEach(k => {
                    exportData[k] = parseFloat((displayData[k] - (m[k] || 0)).toFixed(2));
                });
                exportData.deltaCash = parseFloat((exportData.cashNet - exportData.posCashLogiciel).toFixed(2));
            }
        }

        this.lastExport = exportData;
        this.renderFinalRecap(displayData);
    },

    renderFinalRecap(f) {
        const titleLabel = (f.service === 'Midi') ? 'VÉRIFICATION MIDI' : 'CUMUL JOURNÉE (Z)';
        document.getElementById('recap-body').innerHTML = `
            <div class="recap-list-final">
                <div class="recap-row"><span>Type</span> <b>${titleLabel}</b></div>
                <hr>
                <div class="recap-row"><span>Cartes Bancaires</span> <b>${f.cb.toFixed(2)}€</b></div>
                <div class="recap-row"><span>Tickets Resto</span> <b>${f.tr.toFixed(2)}€</b></div>
                <div class="recap-row"><span>ANCV (Cumul)</span> <b>${(f.ancvP + f.ancvC).toFixed(2)}€</b></div>
                <div class="recap-row"><span>MyPos</span> <b>${f.mypos.toFixed(2)}€</b></div>
                <div class="recap-row"><span>Chèques</span> <b>${f.checks.toFixed(2)}€</b></div>
                <hr>
                <div class="recap-row"><span>Espèces Net</span> <b>${f.cashNet.toFixed(2)}€</b></div>
                <div class="recap-row" style="background:${f.deltaCash < 0 ? '#fee2e2' : '#f0fdf4'}; padding:5px; border-radius:8px;">
                    <span>Écart / Logiciel</span> <b style="color:${f.deltaCash < 0 ? 'red' : 'green'}">${f.deltaCash.toFixed(2)}€</b>
                </div>
                <hr>
                <div class="recap-row" style="font-size:0.85rem"><span>Pizzas</span> <b>${f.pizzas_e} E / ${f.pizzas_p} P</b></div>
                <div class="recap-row" style="font-size:0.85rem"><span>TVA (5/10/20)</span> <b>${f.tva5}/${f.tva10}/${f.tva20}</b></div>
            </div>
            <button class="btn-primary" style="margin-top:15px" onclick="app.send()">💾 ARCHIVER LE SERVICE</button>
        `;
        document.getElementById('modal-recap').classList.remove('hidden');
    },

    send() {
        const btn = document.querySelector('#modal-recap .btn-primary');
        btn.disabled = true; btn.innerHTML = "⌛ Envoi...";

        if (this.state.service === 'Midi') {
            const v = id => parseFloat(document.getElementById(id).value) || 0;
            this.state.midiData = {
                cb: v('midi-cb'), tr: v('midi-tr'), mypos: v('midi-mypos'),
                cashNet: v('midi-cash'), ancvP: v('midi-ancv'), ancvC: 0,
                checks: v('midi-checks'), tva5: v('midi-tva5'), tva10: v('midi-tva10'), 
                tva20: v('midi-tva20'), posCashLogiciel: v('midi-cash')
            };
        } else {
            this.state.midiData = null; // Journée finie
        }

        fetch(this.CONFIG.SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(this.lastExport) })
        .then(() => {
            alert("✅ Données archivées !");
            this.resetForm();
            this.closeRecap();
            if (this.state.service === 'Midi') this.setService('Soir');
        })
        .catch(() => { alert("Erreur d'envoi"); btn.disabled = false; });
    },

    resetForm() {
        this.state.ancv = []; this.state.checks = []; this.state.mypos = [];
        document.querySelectorAll('input[type="number"]').forEach(i => i.value = '');
        this.refreshUI();
    },

    closeRecap() { document.getElementById('modal-recap').classList.add('hidden'); },
    saveToStorage() { localStorage.setItem('vesuvio_v10', JSON.stringify(this.state)); },
    loadFromStorage() { const s = JSON.parse(localStorage.getItem('vesuvio_v10')); if(s) this.state = s; },
    bindEvents() { document.addEventListener('input', () => this.refreshUI()); }
};
document.addEventListener('DOMContentLoaded', () => app.init());
