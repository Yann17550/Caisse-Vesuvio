const app = {
    state: {
        service: 'Midi',
        ancv: [], checks: [], mypos: [],
        fondCaisse: 134.00,
        midiData: null
    },
    CONFIG: { SCRIPT_URL: "https://script.google.com/macros/s/AKfycbw-Ovrq3YgPdlAH2SbQhBU90N4xcpfTxZSbbGNiTLao3hjz6Lk8QZwYB-a4pIWshT9PDA/exec" },

    init() {
        this.loadFromStorage();
        this.renderCashGrid();
        
        const fInput = document.getElementById('fond-caisse-input');
        if(fInput) fInput.value = this.state.fondCaisse.toFixed(2);
        
        this.setService(this.state.service);
        this.bindEvents();
        this.refreshUI();
    },

    setService(mode) {
        this.state.service = mode;
        document.body.className = (mode === 'Midi') ? 'theme-midi' : 'theme-soir';
        
        const bM = document.getElementById('btn-midi');
        const bS = document.getElementById('btn-soir');
        if(bM) bM.className = (mode === 'Midi') ? 'active-midi' : '';
        if(bS) bS.className = (mode === 'Soir') ? 'active-soir' : '';
        
        const viewMidi = document.getElementById('view-midi-fast');
        const containerSoir = document.getElementById('views-soir-container');
        const navMidiBtn = document.getElementById('nav-midi-btn');
        const soirOnlyBtns = document.querySelectorAll('.soir-only');

        if (mode === 'Midi') {
            if(viewMidi) viewMidi.classList.remove('hidden');
            if(containerSoir) containerSoir.classList.add('hidden');
            if(navMidiBtn) navMidiBtn.classList.remove('hidden');
            soirOnlyBtns.forEach(b => b.classList.add('hidden'));
        } else {
            if(viewMidi) viewMidi.classList.add('hidden');
            if(containerSoir) containerSoir.classList.remove('hidden');
            if(navMidiBtn) navMidiBtn.classList.add('hidden');
            soirOnlyBtns.forEach(b => b.classList.remove('hidden'));
            this.showView('view-cards-soir');
        }
        this.saveToStorage();
    },

    showView(id) {
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        const target = document.getElementById(id);
        if(target) target.classList.remove('hidden');
        window.scrollTo(0,0);
    },

    renderCashGrid() {
        const units = [100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1];
        const container = document.getElementById('cash-container');
        if(!container) return;

        container.innerHTML = units.map(u => {
            let def = "";
            if (u === 20) def = "2";
            if (u === 10 || u === 5) def = "4";
            if (u === 2 || u === 1) def = "10";
            if (u === 0.5 || u === 0.2 || u === 0.1) def = "5";
            
            return `
                <div class="cash-item">
                    <label>${u}€</label>
                    <input type="number" data-unit="${u}" class="cash-in" inputmode="numeric" value="${def}"
                           onfocus="if(this.value=='${def}') this.value='';" 
                           onblur="if(this.value=='') this.value='${def}'; app.refreshUI();">
                </div>`;
        }).join('');
    },

    toggleAncvInput() {
        const isPapier = document.getElementById('type-p').checked;
        document.getElementById('ancv-values-papier').classList.toggle('hidden', !isPapier);
        document.getElementById('ancv-values-connect').classList.toggle('hidden', isPapier);
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
            const t = document.querySelector('input[name="ancv-t"]:checked').value;
            let v = 0;
            if (t === 'Papier') {
                v = parseFloat(document.querySelector('input[name="ancv-v-fixe"]:checked').value);
            } else {
                v = parseFloat(document.getElementById('ancv-val-soir').value);
            }
            if (q > 0 && v > 0) {
                this.state.ancv.push({ val: v, qty: q, type: t });
                document.getElementById('ancv-qty-soir').value = '';
                document.getElementById('ancv-val-soir').value = '';
            }
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
        
        const netDisp = document.getElementById('cash-net-display');
        if(netDisp) netDisp.textContent = net.toFixed(2);
        
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
        
        if (this.state.service === 'Midi') {
            this.lastExport = {
                service: 'Midi', 
                cb: v('midi-cb'), tr: v('midi-tr'), mypos: v('midi-mypos'),
                cashNet: v('midi-cash'), ancvP: v('midi-ancv-p'), ancvC: v('midi-ancv-c'),
                checks: v('midi-checks'), pizzas_e: v('midi-piz-e'), pizzas_p: v('midi-piz-p'),
                tva5: v('midi-tva5'), tva10: v('midi-tva10'), tva20: v('midi-tva20'),
                posCashLogiciel: v('midi-cash'), deltaCash: 0
            };
            this.state.midiData = JSON.parse(JSON.stringify(this.lastExport));
        } else {
            // AFFICHAGE DES CUMULS RÉELS POUR TON CONTRÔLE
            this.lastExport = {
                service: 'Soir', 
                cb: (v('cb-contact-soir') + v('cb-sans-contact-soir')),
                tr: (v('tr-contact-soir') + v('tr-sans-contact-soir')),
                mypos: this.state.mypos.reduce((a, b) => a + b, 0), 
                cashNet: netVal,
                ancvP: this.state.ancv.filter(i => i.type === 'Papier').reduce((a, b) => a + (b.val * b.qty), 0),
                ancvC: this.state.ancv.filter(i => i.type === 'Connect').reduce((a, b) => a + (b.val * b.qty), 0),
                checks: this.state.checks.reduce((a, b) => a + b, 0),
                pizzas_e: v('pos-piz-e-soir'), 
                pizzas_p: v('pos-piz-p-soir'),
                tva5: v('tva5-soir'), 
                tva10: v('tva10-soir'), 
                tva20: v('tva20-soir'),
                posCashLogiciel: v('pos-cash-soir')
            };
            this.lastExport.deltaCash = parseFloat((this.lastExport.cashNet - this.lastExport.posCashLogiciel).toFixed(2));
        }
        this.renderFinalRecap(this.lastExport);
    },

    renderFinalRecap(f) {
        const title = (f.service === 'Midi') ? 'VÉRIFICATION MIDI' : 'CLÔTURE SOIR';
        const row = (l, v) => `<div class="recap-row"><span>${l}</span><b>${(v||0).toFixed(2)}€</b></div>`;
        const caTotal = (f.cb||0)+(f.tr||0)+(f.ancvP||0)+(f.ancvC||0)+(f.checks||0)+(f.posCashLogiciel||0);

        let html = `
            <div class="recap-list-final">
                <h2 style="margin:0 0 10px 0; border-bottom:2px solid #333;">${title}</h2>
                ${row("CB", f.cb)} ${row("CB TR", f.tr)} ${row("Chèques", f.checks)}
                ${row("ANCV P.", f.ancvP)} ${row("ANCV C.", f.ancvC)}
                <div style="margin:10px 0; padding:10px; background:#f1f5f9; border-radius:5px;">
                    ${row("Esp. Logiciel (Z)", f.posCashLogiciel)}
                    ${row("Esp. Réel (Compté)", f.cashNet)}
                    <div class="recap-row" style="margin-top:5px; border-top:1px dashed #ccc;">
                        <span>ÉCART</span><b style="color:${f.deltaCash < 0 ? '#dc2626' : '#16a34a'}">${f.deltaCash.toFixed(2)}€</b>
                    </div>
                </div>
                <div class="recap-row" style="background:#334155; color:white; padding:8px; border-radius:5px;">
                    <span>CA TOTAL RÉEL</span><b>${caTotal.toFixed(2)}€</b>
                </div>
            </div>
            <button class="btn-primary" style="margin-top:15px; width:100%;" onclick="app.send()">💾 ARCHIVER LE SERVICE</button>
        `;
        document.getElementById('recap-body').innerHTML = html;
        document.getElementById('modal-recap').classList.remove('hidden');
    },

send() {
    const btn = document.querySelector('#modal-recap .btn-primary');
    btn.disabled = true; btn.innerHTML = "⌛ Envoi...";

    let dataToSend = JSON.parse(JSON.stringify(this.lastExport));
    
    const params = new URLSearchParams({ payload: JSON.stringify(dataToSend) });
    const url = `${this.CONFIG.SCRIPT_URL}?${params.toString()}`;

    // OUVRE L'URL DIRECTEMENT DANS UN NOUVEL ONGLET
    window.open(url, '_blank');
    
    btn.disabled = false;
    btn.innerHTML = "💾 ARCHIVER LE SERVICE";
},

    closeRecap() { document.getElementById('modal-recap').classList.add('hidden'); },
    saveToStorage() { localStorage.setItem('vesuvio_v29', JSON.stringify(this.state)); },
    loadFromStorage() { const s = JSON.parse(localStorage.getItem('vesuvio_v29')); if(s) this.state = s; },
    bindEvents() { 
        document.addEventListener('input', () => this.refreshUI());
        document.addEventListener('focusin', (e) => {
            if(e.target.tagName === 'INPUT' && e.target.value === '0') e.target.value = '';
        });
    }
};
document.addEventListener('DOMContentLoaded', () => app.init());
