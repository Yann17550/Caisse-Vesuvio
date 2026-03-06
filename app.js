
const app = {
    state: {
        service: 'Midi',
        ancv: [], checks: [], mypos: [],
        fondCaisse: 134.00
    },
    CONFIG: { SCRIPT_URL: "https://script.google.com/macros/s/AKfycbwrcBUs3ubqrkykwD3mlxK2Gu8Lu9IJaVO99c4Eek4WHbPFoFsCsztuRyhYva8EwRpAHQ/exec" },

    init() {
        this.renderCashGrid();
        this.loadFromStorage();
        if(document.getElementById('fond-caisse-input')) 
            document.getElementById('fond-caisse-input').value = this.state.fondCaisse.toFixed(2);
        this.setService(this.state.service);
        this.bindEvents();
        this.refreshUI();
    },

    setService(mode) {
        this.state.service = mode;
        document.body.className = (mode === 'Midi') ? 'theme-midi' : 'theme-soir';
        document.getElementById('btn-midi').className = (mode === 'Midi') ? 'active-midi' : '';
        document.getElementById('btn-soir').className = (mode === 'Soir') ? 'active-soir' : '';
        
        const soirBtns = document.querySelectorAll('.soir-only');
        if (mode === 'Midi') {
            document.getElementById('view-midi-fast').classList.remove('hidden');
            document.getElementById('views-soir-container').classList.add('hidden');
            soirBtns.forEach(b => b.classList.add('hidden'));
            document.getElementById('nav-midi-btn').classList.remove('hidden');
        } else {
            document.getElementById('view-midi-fast').classList.add('hidden');
            document.getElementById('views-soir-container').classList.remove('hidden');
            soirBtns.forEach(b => b.classList.remove('hidden'));
            document.getElementById('nav-midi-btn').classList.add('hidden');
            this.showView('view-cards-soir');
        }
        this.saveToStorage();
    },

    showView(id) {
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
        window.scrollTo(0,0);
    },

    renderCashGrid() {
        const units = [100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1];
        document.getElementById('cash-container').innerHTML = units.map(u => {
            let def = "";
            // Application de tes quantités par défaut
            if (u === 20) def = "2";
            if (u === 10 || u === 5) def = "4";
            if (u === 2 || u === 1) def = "10";
            if (u === 0.5 || u === 0.2 || u === 0.1) def = "5";
            
            return `
                <div class="cash-item">
                    <label>${u}€</label>
                    <input type="number" data-unit="${u}" class="cash-in" inputmode="numeric" value="${def}">
                </div>`;
        }).join('');
    },
    
    addItem(type) {
        if (type === 'mypos') {
            const v = parseFloat(document.getElementById('mypos-amt-soir').value);
            if (v > 0) this.state.mypos.push(v);
            document.getElementById('mypos-amt-soir').value = '';
        } else if (type === 'checks') {
            const v = parseFloat(document.getElementById('check-amt-soir').value);
            if (v > 0) this.state.checks.push(v);
            document.getElementById('check-amt-soir').value = '';
        } else if (type === 'ancv') {
            const q = parseInt(document.getElementById('ancv-qty-soir').value);
            const v = parseFloat(document.getElementById('ancv-val-soir').value);
            const t = document.querySelector('input[name="ancv-t"]:checked').value;
            if (q > 0 && v > 0) this.state.ancv.push({ val: v, qty: q, type: t });
            document.getElementById('ancv-qty-soir').value = '';
        }
        this.refreshUI();
    },

    removeItem(t, i) { this.state[t].splice(i, 1); this.refreshUI(); },

    refreshUI() {
        const fInput = document.getElementById('fond-caisse-input');
        if (fInput) this.state.fondCaisse = parseFloat(fInput.value) || 0;
        let brut = 0;
        document.querySelectorAll('.cash-in').forEach(i => brut += (parseFloat(i.dataset.unit) * (parseInt(i.value) || 0)));
        const net = brut - this.state.fondCaisse;
        if(document.getElementById('cash-net-display')) document.getElementById('cash-net-display').textContent = net.toFixed(2);
        this.updateList('mypos-recap-soir', this.state.mypos, 'mypos');
        this.updateList('checks-recap-soir', this.state.checks, 'checks');
        this.updateList('ancv-recap-soir', this.state.ancv, 'ancv', true);
        this.saveToStorage();
    },

    updateList(id, data, typeKey, isAncv = false) {
        const el = document.getElementById(id); if (!el) return;
        el.innerHTML = data.map((v, i) => {
            const txt = isAncv ? `${v.type} ${v.qty}x${v.val}€` : `${typeKey.toUpperCase()} ${v}€`;
            return `<div class="list-item"><span>${txt}</span><button onclick="app.removeItem('${typeKey}', ${i})">❌</button></div>`;
        }).join('');
    },

    openRecap() {
        const v = id => parseFloat(document.getElementById(id)?.value) || 0;
        const netVal = parseFloat(document.getElementById('cash-net-display')?.textContent) || 0;
        let f = {};

        if (this.state.service === 'Midi') {
            f = {
                service: 'Midi', 
                cb: v('midi-cb'), tr: v('midi-tr'), mypos: v('midi-mypos'),
                cashNet: v('midi-cash'), 
                ancvP: v('midi-ancv-p'),
                ancvC: v('midi-ancv-c'),
                checks: v('midi-checks'), pizzas_e: v('midi-piz-e'), pizzas_p: v('midi-piz-p'),
                tva5: v('midi-tva5'), tva10: v('midi-tva10'), tva20: v('midi-tva20'),
                posCashLogiciel: v('midi-cash'), deltaCash: 0
            };
        } else {
            // CALCUL DES TOTAUX POUR LE RECAP (Contact + Sans Contact)
            const cbTotalVal = v('cb-contact-soir') + v('cb-sans-contact-soir');
            const trTotalVal = v('tr-contact-soir') + v('tr-sans-contact-soir');
            
            f = {
                service: 'Soir', 
                cb: cbTotalVal,
                tr: trTotalVal,
                mypos: this.state.mypos.reduce((a, b) => a + b, 0), 
                cashNet: netVal,
                ancvP: this.state.ancv.filter(i => i.type === 'Papier').reduce((a, b) => a + (b.val * b.qty), 0),
                ancvC: this.state.ancv.filter(i => i.type === 'Connect').reduce((a, b) => a + (b.val * b.qty), 0),
                checks: this.state.checks.reduce((a, b) => a + b, 0),
                pizzas_e: v('pos-piz-e-soir'), pizzas_p: v('pos-piz-p-soir'),
                tva5: v('tva5-soir'), tva10: v('tva10-soir'), tva20: v('tva20-soir'),
                posCashLogiciel: v('pos-cash-soir')
            };
            f.deltaCash = parseFloat((f.cashNet - f.posCashLogiciel).toFixed(2));
        }
        this.lastExport = f;
        this.renderFinalRecap(f);
    },

    renderFinalRecap(f) {
        const title = (f.service === 'Midi') ? 'VÉRIFICATION MIDI' : 'CLÔTURE';
        const caCaisse = (f.cb||0)+(f.tr||0)+(f.ancvP||0)+(f.ancvC||0)+(f.checks||0)+(f.posCashLogiciel||0);
        const row = (l, v) => `<div class="recap-row"><span>${l}</span><b>${(v||0).toFixed(2)}€</b></div>`;

        let html = `
            <div class="recap-list-final">
                <h2 style="margin:0 0 10px 0; border-bottom:2px solid #333; font-size:1.2rem;">${title}</h2>
                ${row("CB Total (Z)", f.cb)}
                ${row("CB TR Total (Z)", f.tr)}
                ${row("Chèques", f.checks)}
                ${row("ANCV Papier", f.ancvP)}
                ${row("ANCV Connect", f.ancvC)}
                <div style="margin:10px 0; padding:10px; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:5px;">
                    <div style="font-weight:bold; margin-bottom:5px; color:#475569;">CONTRÔLE ESPÈCES</div>
                    ${row("Espèces Adipos (Z)", f.posCashLogiciel)}
                    ${row("Espèces Réel (Net)", f.cashNet)}
                    <div class="recap-row" style="margin-top:5px; border-top:1px dashed #ccc; padding-top:5px;">
                        <span>ÉCART CAISSE</span>
                        <b style="color:${f.deltaCash < 0 ? '#dc2626' : '#16a34a'}">${f.deltaCash.toFixed(2)}€</b>
                    </div>
                </div>
                <div style="background:#f8fafc; padding:8px; border-radius:5px; margin-bottom:10px; border:1px solid #e2e8f0;">
                    <div style="font-weight:bold; margin-bottom:5px; color:#475569;">TVA</div>
                    ${row("TVA 5.5%", f.tva5)}
                    ${row("TVA 10%", f.tva10)}
                    ${row("TVA 20%", f.tva20)}
                </div>
                <div class="recap-row" style="font-size:1.1rem; background:#334155; color:white; padding:8px; border-radius:5px;">
                    <span>CA TOTAL ADIPOS</span><b>${caCaisse.toFixed(2)}€</b>
                </div>
                <div style="margin-top:5px;">${row("MyPos (Hors Z)", f.mypos)}</div>
            </div>
            <button class="btn-primary" style="margin-top:15px; width:100%; height:50px; font-size:1.1rem;" onclick="app.send()">💾 ARCHIVER LE SERVICE</button>
        `;
        document.getElementById('recap-body').innerHTML = html;
        document.getElementById('modal-recap').classList.remove('hidden');
    },

    send() {
        const btn = document.querySelector('#modal-recap .btn-primary');
        btn.disabled = true; btn.innerHTML = "⌛ Envoi...";
        fetch(this.CONFIG.SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(this.lastExport) })
        .then(() => { alert("✅ Données archivées !"); this.resetForm(); this.closeRecap(); if(this.state.service==='Midi') this.setService('Soir'); })
        .catch(() => { alert("Erreur d'envoi"); btn.disabled = false; });
    },

    resetForm() {
        this.state.ancv = []; this.state.checks = []; this.state.mypos = [];
        document.querySelectorAll('input[type="number"]').forEach(i => i.value = '');
        this.renderCashGrid();
        if(document.getElementById('fond-caisse-input')) {
            document.getElementById('fond-caisse-input').value = "134.00";
        }
        this.refreshUI();
    },
    closeRecap() { document.getElementById('modal-recap').classList.add('hidden'); },
    saveToStorage() { localStorage.setItem('vesuvio_v25', JSON.stringify(this.state)); },
    loadFromStorage() { const s = JSON.parse(localStorage.getItem('vesuvio_v25')); if(s) this.state = s; },
    bindEvents() { document.addEventListener('input', () => this.refreshUI()); }
};
document.addEventListener('DOMContentLoaded', () => app.init());
