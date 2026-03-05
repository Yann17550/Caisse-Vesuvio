const app = {
    state: {
        service: 'Midi',
        ancv: [],
        checks: [],
        mypos: [],
        fondCaisse: 134.00,
        midiData: null 
    },
    CONFIG: {
        SCRIPT_URL: "TON_URL_SCRIPT" // Remplace par ton URL Google Apps Script
    },

    init() {
        this.renderCashGrid();
        this.loadFromStorage();
        // Mise à jour de l'input Fond de Caisse avec la valeur stockée
        const fondInput = document.getElementById('fond-caisse-input');
        if (fondInput) fondInput.value = this.state.fondCaisse;
        
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
        // MAJ Fond de Caisse
        const fondInput = document.getElementById('fond-caisse-input');
        if (fondInput) this.state.fondCaisse = parseFloat(fondInput.value) || 0;

        // Calcul Espèces
        let brut = 0;
        document.querySelectorAll('.cash-in').forEach(i => {
            brut += (parseFloat(i.dataset.unit) * (parseInt(i.value) || 0));
        });
        
        const net = brut - this.state.fondCaisse;
        const netDisplay = document.getElementById('cash-net-display');
        if (netDisplay) netDisplay.textContent = net.toFixed(2);

        // MAJ Listes visuelles
        this.updateList('mypos-recap-soir', this.state.mypos, 'mypos');
        this.updateList('checks-recap-soir', this.state.checks, 'checks');
        this.updateList('ancv-recap-soir', this.state.ancv, 'ancv', true);

        this.saveToStorage();
    },

    updateList(id, data, typeKey, isAncv = false) {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = data.map((v, i) => {
            const txt = isAncv ? `${v.type} ${v.qty}x${v.val}€` : `${typeKey.toUpperCase()} ${v}€`;
            return `<div class="list-item"><span>${txt}</span><button onclick="app.removeItem('${typeKey}', ${i})">❌</button></div>`;
        }).join('');
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
            displayData = {
                service: 'Soir',
                cb: v('cb-c-soir') + v('cb-sc-soir'),
                tr: v('tr-c-soir') + v('tr-sc-soir'),
                mypos: this.state.mypos.reduce((a, b) => a + b, 0),
                cashNet: txt('cash-net-display'),
                ancvP: this.state.ancv.filter(i => i.type === 'Papier').reduce((a, b) => a + (b.val * b.qty), 0),
                ancvC: this.state.ancv.filter(i => i.type === 'Connect').reduce((a, b) => a + (b.val * b.qty), 0),
                checks: this.state.checks.reduce((a, b) => a + b, 0),
                pizzas_e: v('pos-piz-e-soir'), pizzas_p: v('pos-piz-p-soir'),
                tva5: v('tva5-soir'), tva10: v('tva10-soir'), tva20: v('tva20-soir'),
                posCashLogiciel: v('pos-cash-soir')
            };
            displayData.deltaCash = parseFloat((displayData.cashNet - displayData.posCashLogiciel).toFixed(2));

            exportData = { ...displayData };
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
        const row = (label, val, suffix = "€") => {
            if (!val || val === 0 || val === "0.00") return "";
            return `<div class="recap-row"><span>${label}</span> <b>${val}${suffix}</b></div>`;
        };

        let html = `
            <div class="recap-list-final">
                <div class="recap-row"><span>Type</span> <b>${titleLabel}</b></div>
                <hr>
                ${row("Cartes Bancaires", f.cb.toFixed(2))}
                ${row("Tickets Resto", f.tr.toFixed(2))}
                ${row("ANCV (Cumul)", (f.ancvP + f.ancvC).toFixed(2))}
                ${row("Chèques", f.checks.toFixed(2))}
                <hr>
                ${row("Espèces Net", f.cashNet.toFixed(2))}
                ${row("Espèces Adipos", f.posCashLogiciel.toFixed(2))}
                
                <div class="recap-row" style="background:${f.deltaCash < 0 ? '#fee2e2' : '#f0fdf4'}; padding:5px; border-radius:8px; margin-top:5px;">
                    <span>Écart / Logiciel</span> <b style="color:${f.deltaCash < 0 ? 'red' : 'green'}">${f.deltaCash.toFixed(2)}€</b>
                </div>
                ${row("MyPos (Hors Z)", f.mypos.toFixed(2))}
                <hr>
                <div class="recap-row"><span>🍕 Emporté</span> <b>${f.pizzas_e || 0}</b></div>
                <div class="recap-row"><span>🍽️ Sur Place</span> <b>${f.pizzas_p || 0}</b></div>
                <div style="margin-top:8px; border-top:1px dashed #cbd5e1; padding-top:5px;">
                    ${row("TVA 5.5%", f.tva5.toFixed(2))}
                    ${row("TVA 10%", f.tva10.toFixed(2))}
                    ${row("TVA 20%", f.tva20.toFixed(2))}
                </div>
            </div>
            <button class="btn-primary" style="margin-top:15px" onclick="app.send()">💾 ARCHIVER LE SERVICE</button>
        `;

        document.getElementById('recap-body').innerHTML = html;
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
            this.state.midiData = null;
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
    saveToStorage() { localStorage.setItem('vesuvio_v13', JSON.stringify(this.state)); },
    loadFromStorage() { 
        const s = JSON.parse(localStorage.getItem('vesuvio_v13')); 
        if(s) {
            this.state = s;
            if (this.state.fondCaisse === undefined) this.state.fondCaisse = 134.00;
        }
    },
    bindEvents() { document.addEventListener('input', () => this.refreshUI()); }
};
document.addEventListener('DOMContentLoaded', () => app.init());
