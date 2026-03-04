/**
 * APP LE VESUVIO - VERSION FINALE PRODUCTION
 * Gère le mode rapide (Midi) et complet (Soir)
 */
const app = {
    state: {
        service: 'Midi',
        ancv: [],
        checks: [],
        mypos: [],
        midiData: null // Stockage pour soustraction du soir
    },
    CONFIG: {
        SCRIPT_URL: "https://script.google.com/macros/s/AKfycbwrcBUs3ubqrkykwD3mlxK2Gu8Lu9IJaVO99c4Eek4WHbPFoFsCsztuRyhYva8EwRpAHQ/exec",
        CASH_OFFSET: 134.00
    },

    init() {
        this.renderCashGrid();
        this.loadFromStorage();
        this.setService(this.state.service); // Applique le thème et la vue au démarrage
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
        // Calcul Espèces Soir
        let brut = 0;
        document.querySelectorAll('.cash-in').forEach(i => {
            brut += (parseFloat(i.dataset.unit) * (parseInt(i.value) || 0));
        });
        document.getElementById('cash-brut-soir').textContent = brut.toFixed(2);

        // Recaps listes Soir
        document.getElementById('mypos-recap-soir').innerHTML = this.state.mypos.map((v, i) => `<div class="list-item"><span>MyPos ${v}€</span><button onclick="app.removeItem('mypos', ${i})">❌</button></div>`).join('');
        document.getElementById('checks-recap-soir').innerHTML = this.state.checks.map((v, i) => `<div class="list-item"><span>Chèque ${v}€</span><button onclick="app.removeItem('checks', ${i})">❌</button></div>`).join('');
        document.getElementById('ancv-recap-soir').innerHTML = this.state.ancv.map((v, i) => `<div class="list-item"><span>${v.type} ${v.qty}x${v.val}€</span><button onclick="app.removeItem('ancv', ${i})">❌</button></div>`).join('');

        this.saveToStorage();
    },

    openRecap() {
        const v = id => parseFloat(document.getElementById(id).value) || 0;
        const txt = id => parseFloat(document.getElementById(id).textContent) || 0;
        let final = {};

        if (this.state.service === 'Midi') {
            final = {
                service: 'Midi',
                cb: v('midi-cb'), tr: v('midi-tr'), mypos: v('midi-mypos'),
                cashNet: v('midi-cash'), ancvP: v('midi-ancv'), ancvC: 0,
                checks: v('midi-checks'), pizzas_e: v('midi-piz-e'), pizzas_p: v('midi-piz-p'),
                tva5: v('midi-tva5'), tva10: v('midi-tva10'), tva20: v('midi-tva20'),
                posCashLogiciel: v('midi-cash'), deltaCash: 0
            };
        } else {
            // CALCULS SOIR
            const rawSoir = {
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

            final = { ...rawSoir, service: 'Soir' };
            // Soustraction du Midi si présent
            if (this.state.midiData) {
                const m = this.state.midiData;
                ['cb', 'tr', 'mypos', 'cashNet', 'ancvP', 'ancvC', 'checks', 'tva5', 'tva10', 'tva20', 'posCashLogiciel'].forEach(k => {
                    final[k] = parseFloat((rawSoir[k] - m[k]).toFixed(2));
                });
            }
            final.deltaCash = parseFloat((final.cashNet - final.posCashLogiciel).toFixed(2));
        }

        this.lastExport = final;
        this.renderFinalRecap(final);
    },

    renderFinalRecap(f) {
        document.getElementById('recap-body').innerHTML = `
            <div class="recap-list-final">
                <div class="recap-row"><span>Service</span> <b>${f.service}</b></div>
                <div class="recap-row"><span>Pizzas</span> <b>${f.pizzas_e} E / ${f.pizzas_p} P</b></div>
                <hr>
                <div class="recap-row"><span>CB</span> <b>${f.cb.toFixed(2)}€</b></div>
                <div class="recap-row"><span>TR</span> <b>${f.tr.toFixed(2)}€</b></div>
                <div class="recap-row"><span>ANCV P/C</span> <b>${f.ancvP.toFixed(2)} / ${f.ancvC.toFixed(2)}€</b></div>
                <div class="recap-row"><span>MyPos</span> <b>${f.mypos.toFixed(2)}€</b></div>
                <hr>
                <div class="recap-row"><span>Net Espèces</span> <b>${f.cashNet.toFixed(2)}€</b></div>
                <div class="recap-row" style="background:${f.deltaCash < 0 ? '#fee2e2' : '#f0fdf4'}">
                    <span>Écart Caisse</span> <b>${f.deltaCash.toFixed(2)}€</b>
                </div>
                <hr>
                <div class="recap-row" style="font-size:0.8rem"><span>TVA 5.5 / 10 / 20</span> <b>${f.tva5} / ${f.tva10} / ${f.tva20}</b></div>
            </div>
            <button class="btn-primary" style="margin-top:15px" onclick="app.send()">💾 ARCHIVER LE SERVICE</button>
        `;
        document.getElementById('modal-recap').classList.remove('hidden');
    },

    send() {
        const btn = document.querySelector('#modal-recap .btn-primary');
        btn.disabled = true; btn.innerHTML = "⌛ Envoi...";

        // Sauvegarde du cumul pour le soir si on est le midi
        if (this.state.service === 'Midi') {
            this.state.midiData = { ...this.lastExport };
        } else {
            this.state.midiData = null;
        }

        fetch(this.CONFIG.SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(this.lastExport) })
        .then(() => {
            alert("✅ Service Archivé !");
            this.resetForm();
            this.closeRecap();
            if (this.state.service === 'Midi') this.setService('Soir');
        })
        .catch(() => { alert("Erreur connexion"); btn.disabled = false; });
    },

    resetForm() {
        this.state.ancv = []; this.state.checks = []; this.state.mypos = [];
        document.querySelectorAll('input[type="number"]').forEach(i => i.value = '');
        this.refreshUI();
    },

    closeRecap() { document.getElementById('modal-recap').classList.add('hidden'); },
    saveToStorage() { localStorage.setItem('vesuvio_v7', JSON.stringify(this.state)); },
    loadFromStorage() { const s = JSON.parse(localStorage.getItem('vesuvio_v7')); if(s) this.state = s; },
    bindEvents() { document.addEventListener('input', () => this.refreshUI()); }
};
document.addEventListener('DOMContentLoaded', () => app.init());
