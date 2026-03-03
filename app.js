/**
 * APPLICATION : Caisse Le Vesuvio
 * MISSION : Gestion double service (Midi/Soir) avec soustraction automatique
 * ARCHITECTURE : Production-grade, modulaire, stockage local persistant
 */

const app = {
    // État de l'application
    state: { 
        service: 'Midi', // Par défaut
        ancv: [], 
        checks: [], 
        mypos: [],
        midiData: null // Stockage des données du midi pour soustraction le soir
    },

    CONFIG: {
        // REMPLACE PAR TON NOUVEAU LIEN GOOGLE SCRIPT POUR LE VESUVIO
        SCRIPT_URL: "https://script.google.com/macros/s/AKfycbz...", 
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

    // --- GESTION DU SERVICE (MIDI / SOIR) ---
    setService(mode) {
        this.state.service = mode;
        this.updateServiceUI();
        this.refreshUI();
        this.saveToStorage();
    },

    updateServiceUI() {
        const btnMidi = document.getElementById('btn-midi');
        const btnSoir = document.getElementById('btn-soir');
        
        if (this.state.service === 'Midi') {
            btnMidi.classList.add('active-midi');
            btnSoir.classList.remove('active-soir');
        } else {
            btnMidi.classList.remove('active-midi');
            btnSoir.classList.add('active-soir');
        }
    },

    // --- NAVIGATION ET RENDU ---
    showView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        const target = document.getElementById(viewId);
        if (target) target.classList.remove('hidden');
        window.scrollTo(0,0);
        this.saveToStorage();
    },

    renderCashGrid() {
        const units = [100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1];
        const container = document.getElementById('cash-container');
        if (!container) return;
        container.innerHTML = units.map(u => `
            <div class="cash-item">
                <label>${u >= 5 ? 'Billet' : 'Pièce'} ${u}€</label>
                <input type="number" data-unit="${u}" class="cash-in" inputmode="numeric" placeholder="0">
            </div>
        `).join('');
    },

    // --- LOGIQUE DES LISTES (MYPOS, CHEQUES) ---
    addMyPos() {
        const amt = parseFloat(document.getElementById('mypos-amount').value) || 0;
        if (amt > 0) { this.state.mypos.push(amt); document.getElementById('mypos-amount').value = ''; this.refreshUI(); }
    },
    removeMyPos(idx) { this.state.mypos.splice(idx, 1); this.refreshUI(); },

    addCheck() {
        const amt = parseFloat(document.getElementById('check-amount').value) || 0;
        if (amt > 0) { this.state.checks.push(amt); document.getElementById('check-amount').value = ''; this.refreshUI(); }
    },
    removeCheck(idx) { this.state.checks.splice(idx, 1); this.refreshUI(); },

    // --- CALCULS ET INTERFACE ---
    refreshUI() {
        const getSum = (id1, id2) => (parseFloat(document.getElementById(id1).value) || 0) + (parseFloat(document.getElementById(id2).value) || 0);
        
        // Totaux Cartes
        document.getElementById('total-cb').textContent = getSum('cb-contact', 'cb-sans-contact').toFixed(2);
        document.getElementById('total-tr').textContent = getSum('tr-contact', 'tr-sans-contact').toFixed(2);
        document.getElementById('total-amex').textContent = getSum('amex-contact', 'amex-sans-contact').toFixed(2);

        // Espèces
        let brut = 0;
        let hasInputCash = false;
        document.querySelectorAll('.cash-in').forEach(i => {
            const qty = parseInt(i.value) || 0;
            if (qty > 0) hasInputCash = true;
            brut += (parseFloat(i.dataset.unit) * qty);
        });

        const offset = parseFloat(document.getElementById('cash-offset').value) || 0;
        const net = hasInputCash ? (brut - offset) : 0;
        document.getElementById('total-cash-brut').textContent = brut.toFixed(2);
        document.getElementById('total-cash-net').textContent = net.toFixed(2);

        // Autres
        document.getElementById('total-checks').textContent = this.state.checks.reduce((a, b) => a + b, 0).toFixed(2);
        document.getElementById('total-mypos').textContent = this.state.mypos.reduce((a, b) => a + b, 0).toFixed(2);

        this.renderRecaps();
        this.saveToStorage();
    },

    renderRecaps() {
        document.getElementById('mypos-recap').innerHTML = this.state.mypos.map((amt, idx) => `<div class="recap-item"><span>#${idx+1}</span><strong>${amt.toFixed(2)}€</strong><button onclick="app.removeMyPos(${idx})">❌</button></div>`).join('');
        document.getElementById('checks-recap').innerHTML = this.state.checks.map((amt, idx) => `<div class="recap-item"><span>#${idx+1}</span><strong>${amt.toFixed(2)}€</strong><button onclick="app.removeCheck(${idx})">❌</button></div>`).join('');
    },

    // --- CLÔTURE ET ENVOI ---
    openRecap() {
        const v = id => parseFloat(document.getElementById(id).textContent) || 0;
        const getIn = id => parseFloat(document.getElementById(id).value) || 0;

        // Préparation des données brutes
        const rawData = {
            service: this.state.service,
            pizzas_e: getIn('pos-pizzas-emporte'),
            pizzas_p: getIn('pos-pizzas-place'),
            cb: v('total-cb') + v('total-amex'),
            tr: v('total-tr'),
            mypos: v('total-mypos'),
            cashNet: v('total-cash-net'),
            checks: v('total-checks'),
            tva5: getIn('tva-5'),
            tva10: getIn('tva-10'),
            tva20: getIn('tva-20'),
            posCashLogiciel: getIn('pos-cash')
        };

        // Logique de soustraction si c'est le soir
        let finalData = { ...rawData };
        let infoCalcul = "";

        if (this.state.service === 'Soir' && this.state.midiData) {
            const midi = this.state.midiData;
            finalData.cb -= midi.cb;
            finalData.tr -= midi.tr;
            finalData.mypos -= midi.mypos;
            finalData.cashNet -= midi.cashNet;
            finalData.checks -= midi.checks;
            finalData.tva5 -= midi.tva5;
            finalData.tva10 -= midi.tva10;
            finalData.tva20 -= midi.tva20;
            infoCalcul = `<p style="color:#3498db; font-size:0.8rem;">ℹ️ Données du midi déduites automatiquement.</p>`;
        }

        this.currentDataToSend = finalData;

        let html = `
            <div style="font-size:0.9rem; border-bottom:1px solid #ddd; padding-bottom:10px; margin-bottom:10px;">
                <p style="font-weight:bold; text-decoration:underline;">DÉTAILS ${this.state.service.toUpperCase()}</p>
                ${infoCalcul}
                <div class="recap-row"><span>Pizzas (E/P) :</span><strong>${finalData.pizzas_e} / ${finalData.pizzas_p}</strong></div>
                <div class="recap-row"><span>CB Net :</span><strong>${finalData.cb.toFixed(2)} €</strong></div>
                <div class="recap-row"><span>Espèces Net :</span><strong>${finalData.cashNet.toFixed(2)} €</strong></div>
                <div class="recap-row"><span>TR Net :</span><strong>${finalData.tr.toFixed(2)} €</strong></div>
            </div>
            <button id="btn-sync" class="btn-primary" style="width:100%;" onclick="app.sendToGoogleSheet()">💾 VALIDER LE SERVICE</button>
        `;

        document.getElementById('recap-body').innerHTML = html;
        document.getElementById('modal-recap').classList.remove('hidden');
    },

    sendToGoogleSheet() {
        const btn = document.getElementById('btn-sync');
        btn.disabled = true; btn.textContent = "🚀 Archivage...";

        const instructions = this.state.service === 'Soir' ? this.calculateCashShortage() : null;

        fetch(this.CONFIG.SCRIPT_URL, { 
            method: 'POST', 
            mode: 'no-cors', 
            body: JSON.stringify(this.currentDataToSend) 
        })
        .then(() => {
            if (this.state.service === 'Midi') {
                // On garde les données du midi en mémoire pour le soir
                this.state.midiData = { ...this.currentDataToSend };
            } else {
                // Le soir on vide tout
                this.state.midiData = null;
            }
            
            btn.textContent = "✅ ENREGISTRÉ";
            setTimeout(() => {
                this.resetAllData();
                this.closeRecap();
                if (instructions) this.showShortageModal(instructions);
                this.showView('view-cards');
                // Si on vient de finir le midi, on bascule sur Soir automatiquement
                if (this.state.service === 'Midi') this.setService('Soir');
            }, 800);
        })
        .catch(() => { alert("Erreur."); btn.disabled = false; });
    },

    // --- UTILITAIRES ---
    calculateCashShortage() {
        const currentIn = {};
        document.querySelectorAll('.cash-in').forEach(i => currentIn[i.dataset.unit] = parseInt(i.value) || 0);
        let html = "";
        [20, 10, 5, 2, 1, 0.5, 0.2, 0.1].forEach(u => {
            const manque = this.CONFIG.IDEAL_CASH[u] - (currentIn[u] || 0);
            if (manque > 0) html += `<div style="display:flex; justify-content:space-between; padding:5px 0;"><span>${u}€</span><span style="color:red;">+ ${manque}</span></div>`;
        });
        return html;
    },

    showShortageModal(content) {
        const modal = `<div id="modal-f" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;">
            <div style="background:white;padding:20px;border-radius:15px;width:100%;max-width:320px;color:black;">
                <h3>Fond de caisse (134€)</h3>${content}
                <button class="btn-primary" onclick="this.closest('#modal-f').remove()" style="width:100%;margin-top:15px;">OK</button>
            </div></div>`;
        document.body.insertAdjacentHTML('beforeend', modal);
    },

    resetAllData() {
        // On ne reset pas midiData si on est au midi !
        this.state.checks = []; this.state.mypos = [];
        document.querySelectorAll('input').forEach(i => {
            if (i.id === 'cash-offset') i.value = this.CONFIG.DEFAULT_CASH_OFFSET;
            else if (i.type === 'number') i.value = '';
        });
        this.refreshUI();
    },

    saveToStorage() {
        localStorage.setItem('vesuvio_state', JSON.stringify(this.state));
        // Sauvegarde aussi les inputs pour éviter les pertes en cas de refresh
        const inputs = {};
        document.querySelectorAll('input').forEach(i => { if(i.id) inputs[i.id] = i.value; });
        localStorage.setItem('vesuvio_inputs', JSON.stringify(inputs));
    },

    loadFromStorage() {
        const s = JSON.parse(localStorage.getItem('vesuvio_state'));
        if (s) this.state = s;
        const i = JSON.parse(localStorage.getItem('vesuvio_inputs'));
        if (i) Object.keys(i).forEach(id => { if(document.getElementById(id)) document.getElementById(id).value = i[id]; });
        
        // Recharger la grille des espèces car elle est générée en JS
        const cashVals = JSON.parse(localStorage.getItem('vesuvio_cash'));
        if (cashVals) {
            const inputs = document.querySelectorAll('.cash-in');
            cashVals.forEach((v, idx) => { if(inputs[idx]) inputs[idx].value = v; });
        }
    },

    closeRecap() { document.getElementById('modal-recap').classList.add('hidden'); },
    bindEvents() { document.addEventListener('input', () => this.refreshUI()); }
};

document.addEventListener('DOMContentLoaded', () => app.init());
