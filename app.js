const app = {
    state: { service: 'Midi', ancv: [], checks: [], mypos: [], midiData: null },
    
    CONFIG: {
        SCRIPT_URL: "TON_URL_SCRIPT_ICI", // À REMPLACER PAR TON LIEN GOOGLE SCRIPT
        DEFAULT_CASH_OFFSET: 134.00
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
            <div class="cash-item" style="display:flex; justify-content:space-between; margin-bottom:8px;">
                <label>${u}€</label>
                <input type="number" data-unit="${u}" class="cash-in" inputmode="numeric" style="width:100px; text-align:right; padding:5px;">
            </div>
        `).join('');
    },

    // --- GESTION DES LISTES ---
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

    // --- CALCULS & UI ---
    refreshUI() {
        const v = id => parseFloat(document.getElementById(id).value) || 0;
        const txt = (id, val) => document.getElementById(id).textContent = val.toFixed(2);

        txt('total-cb', v('cb-contact') + v('cb-sans-contact'));
        txt('total-tr', v('tr-contact') + v('tr-sans-contact'));
        txt('total-mypos', this.state.mypos.reduce((a, b) => a + b, 0));
        txt('total-checks', this.state.checks.reduce((a, b) => a + b, 0));
        txt('total-ancv-paper', this.state.ancv.filter(i=>i.type==='paper').reduce((a,b)=>a+(b.val*b.qty),0));
        txt('total-ancv-connect', this.state.ancv.filter(i=>i.type==='connect').reduce((a,b)=>a+(b.val*b.qty),0));

        let brut = 0;
        document.querySelectorAll('.cash-in').forEach(i => brut += (parseFloat(i.dataset.unit) * (parseInt(i.value) || 0)));
        document.getElementById('total-cash-brut').textContent = brut.toFixed(2);
        document.getElementById('total-cash-net').textContent = (brut - v('cash-offset')).toFixed(2);

        this.renderRecaps();
        this.saveToStorage();
    },

    renderRecaps() {
        document.getElementById('ancv-recap').innerHTML = this.state.ancv.map((item, idx) => `<div class="recap-item"><span>${item.type==='paper'?'📄':'📱'} ${item.qty}x${item.val}€</span><button onclick="app.removeAncv(${idx})">❌</button></div>`).join('');
        document.getElementById('checks-recap').innerHTML = this.state.checks.map((amt, idx) => `<div class="recap-item"><span>${amt.toFixed(2)}€</span><button onclick="app.removeCheck(${idx})">❌</button></div>`).join('');
        document.getElementById('mypos-recap').innerHTML = this.state.mypos.map((amt, idx) => `<div class="recap-item"><span>${amt.toFixed(2)}€</span><button onclick="app.removeMyPos(${idx})">❌</button></div>`).join('');
    },

    // --- RÉCAPITULATIF COMPLET ---
    openRecap() {
        const v = id => parseFloat(document.getElementById(id).value) || 0;
        const txt = id => parseFloat(document.getElementById(id).textContent) || 0;

        const raw = {
            service: this.state.service,
            pizzas_e: v('pos-pizzas-e'), pizzas_p: v('pos-pizzas-p'),
            cb: txt('total-cb'), tr: txt('total-tr'), mypos: txt('total-mypos'),
            cashNet: txt('total-cash-net'),
            ancvP: txt('total-ancv-paper'), ancvC: txt('total-ancv-connect'),
            checks: txt('total-checks'),
            tva5: v('tva-5'), tva10: v('tva-10'), tva20: v('tva-20'),
            posCashLogiciel: v('pos-cash')
        };

        // Soustraction MIDI si c'est le SOIR
        let final = { ...raw };
        let infoMidi = "";
        if (this.state.service === 'Soir' && this.state.midiData) {
            const m = this.state.midiData;
            ['cb','tr','mypos','cashNet','ancvP','ancvC','checks','tva5','tva10','tva20','posCashLogiciel'].forEach(k => {
                final[k] = parseFloat((raw[k] - m[k]).toFixed(2));
            });
            infoMidi = `<p style="color:#3498db; font-size:0.75rem; margin-bottom:10px;">ℹ️ Les données du midi ont été déduites.</p>`;
        }

        const delta = parseFloat((final.cashNet - final.posCashLogiciel).toFixed(2));
        this.lastExport = { ...final, deltaCash: delta };

        document.getElementById('recap-body').innerHTML = `
            <div class="recap-expert">
                <p style="text-align:center; font-weight:bold;">SERVICE : ${final.service}</p>
                ${infoMidi}
                <hr>
                <p>🍕 Pizzas : <b>${final.pizzas_e} E / ${final.pizzas_p} P</b></p>
                <p>💳 CB : <b>${final.cb.toFixed(2)}€</b> | 🎫 TR : <b>${final.tr.toFixed(2)}€</b></p>
                <p>🏖️ ANCV (P/C) : <b>${final.ancvP.toFixed(2)} / ${final.ancvC.toFixed(2)}€</b></p>
                <p>✍️ Chèques : <b>${final.checks.toFixed(2)}€</b></p>
                <div style="background:#f1f5f9; padding:10px; border-radius:8px; margin:10px 0; color:#000;">
                    <p>💵 Écart Espèces : <b style="color:${delta < 0 ? 'red' : 'green'}">${delta > 0 ? '+' : ''}${delta.toFixed(2)}€</b></p>
                    <p>📱 MyPos : <b>${final.mypos.toFixed(2)}€</b></p>
                </div>
                <p style="font-size:0.8rem;">📊 TVA : 5.5% : ${final.tva5}€ | 10% : ${final.tva10}€ | 20% : ${final.tva20}€</p>
                <hr>
                <p style="text-align:center; font-size:1.2rem; font-weight:bold;">TOTAL : ${(final.cb+final.tr+final.cashNet+final.ancvP+final.ancvC+final.checks+final.mypos).toFixed(2)}€</p>
            </div>
            <button class="btn-primary" style="width:100%; margin-top:15px;" onclick="app.send()">🚀 VALIDER & ARCHIVER</button>
        `;
        document.getElementById('modal-recap').classList.remove('hidden');
    },

    send() {
        const btn = document.querySelector('#modal-recap .btn-primary');
        btn.disabled = true; btn.textContent = "🚀 Envoi...";
        
        // On sauvegarde le BRUT du midi pour la soustraction du soir
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
            
            btn.textContent = "✅ ARCHIVÉ";
            setTimeout(() => {
                this.resetAll();
                this.closeRecap();
                if (this.state.service === 'Midi') this.setService('Soir');
                else this.setService('Midi');
            }, 1000);
        }).catch(() => { alert("Erreur connexion"); btn.disabled = false; });
    },

    resetAll() {
        this.state.ancv = []; this.state.checks = []; this.state.mypos = [];
        document.querySelectorAll('input[type="number"]').forEach(i => { if(i.id !== 'cash-offset') i.value = ''; });
        this.refreshUI();
    },

    closeRecap() { document.getElementById('modal-recap').classList.add('hidden'); },
    saveToStorage() { localStorage.setItem('vesuvio_v2', JSON.stringify(this.state)); },
    loadFromStorage() { const s = JSON.parse(localStorage.getItem('vesuvio_v2')); if(s) this.state = s; },
    bindEvents() { document.addEventListener('input', () => this.refreshUI()); }
};
document.addEventListener('DOMContentLoaded', () => app.init());
