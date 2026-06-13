const app = {
    // État global de l'application
    state: {
        service: 'Midi',
        ancv: [],
        checks: [],
        mypos: [],
        fondCaisse: 134.00
    },

    // Configuration des URL et variables d'environnement
    CONFIG: {
        SCRIPT_URL: "https://script.google.com/macros/s/AKfycbw-Ovrq3YgPdlAH2SbQhBU90N4xcpfTxZSbbGNiTLao3hjz6Lk8QZwYB-a4pIWshT9PDA/exec"
    },

    /**
     * Initialise l'application au chargement
     * Restaure le stockage, génère l'UI et attache les événements.
     */
    init() {
        this.loadFromStorage();
        this.renderCashGrid();

        const fInput = document.getElementById('fond-caisse-input');
        if (fInput) fInput.value = this.state.fondCaisse.toFixed(2);

        this.setService(this.state.service);
        this.bindEvents();
        this.refreshUI();
    },

    /**
     * Change le service actif (Midi ou Soir)
     * Met à jour les classes CSS, le thème global et sauvegarde l'état.
     */
    setService(mode) {
        this.state.service = mode;
        document.body.className = (mode === 'Midi') ? 'theme-midi' : 'theme-soir';

        const bM = document.getElementById('btn-midi');
        const bS = document.getElementById('btn-soir');
        if (bM) bM.className = (mode === 'Midi') ? 'active-midi' : '';
        if (bS) bS.className = (mode === 'Soir') ? 'active-soir' : '';

        const viewMidi = document.getElementById('view-midi-fast');
        const containerSoir = document.getElementById('views-soir-container');
        const navMidiBtn = document.getElementById('nav-midi-btn');
        const soirOnlyBtns = document.querySelectorAll('.soir-only');

        if (mode === 'Midi') {
            if (viewMidi) viewMidi.classList.remove('hidden');
            if (containerSoir) containerSoir.classList.add('hidden');
            if (navMidiBtn) navMidiBtn.classList.remove('hidden');
            soirOnlyBtns.forEach(b => b.classList.add('hidden'));
        } else {
            if (viewMidi) viewMidi.classList.add('hidden');
            if (containerSoir) containerSoir.classList.remove('hidden');
            if (navMidiBtn) navMidiBtn.classList.add('hidden');
            soirOnlyBtns.forEach(b => b.classList.remove('hidden'));
            this.showView('view-cards-soir');
        }

        this.saveToStorage();
    },

    /**
     * Gère la navigation entre les différentes sections de l'UI
     * Masque toutes les vues et affiche la vue ciblée.
     */
    showView(id) {
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        const target = document.getElementById(id);
        if (target) target.classList.remove('hidden');
        window.scrollTo(0, 0);
    },

    /**
     * Génère la grille de saisie pour les billets et les pièces.
     * Injecte le HTML pour chaque dénomination monétaire.
     */
    renderCashGrid() {
        const billets = [100, 50, 20, 10, 5];
        const pieces = [2, 1, 0.5, 0.2, 0.1];

        const billetsContainer = document.getElementById('cash-billets-container');
        const piecesContainer = document.getElementById('cash-pieces-container');

        const renderInputs = (units, container) => {
            if (!container) return;

            container.innerHTML = units.map(u => {
                let def = "";
                if (u === 20) def = "2";
                if (u === 10 || u === 5) def = "4";
                if (u === 2 || u === 1) def = "10";
                if (u === 0.5 || u === 0.2 || u === 0.1) def = "5";

                return `
                    <div class="cash-item">
                        <label>${u}€</label>
                        <input
                            type="number"
                            data-unit="${u}"
                            class="cash-in"
                            inputmode="numeric"
                            value="${def}"
                            onfocus="if(this.value=='${def}') this.value='';"
                            onblur="if(this.value=='') this.value='${def}'; app.refreshUI();"
                        >
                    </div>
                `;
            }).join('');
        };

        renderInputs(billets, billetsContainer);
        renderInputs(pieces, piecesContainer);
    },

    /**
     * Bascule l'affichage des options ANCV selon le type (Papier ou Connect).
     */
    toggleAncvInput() {
        const isPapier = document.getElementById('type-p').checked;
        document.getElementById('ancv-values-papier').classList.toggle('hidden', !isPapier);
        document.getElementById('ancv-values-connect').classList.toggle('hidden', isPapier);
        document.getElementById('ancv-qty-wrapper').classList.toggle('hidden', !isPapier);
    },

    /**
     * Ajoute un encaissement à la liste correspondante (MyPos, Chèques, ANCV).
     * Valide l'entrée avant l'insertion dans l'état global.
     */
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
            const isPapier = document.querySelector('input[name="ancv-t"]:checked').value === 'Papier';
            const q = isPapier ? parseInt(document.getElementById('ancv-qty-soir').value) : 1;
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

    /**
     * Supprime un encaissement d'une liste spécifique via son index.
     */
    removeItem(t, i) {
        this.state[t].splice(i, 1);
        this.refreshUI();
    },

    /**
     * Rafraîchit les totaux de l'interface principale.
     * Calcule le net des espèces, CB, MyPos, et met à jour les affichages HTML.
     */
    refreshUI() {
        const fInput = document.getElementById('fond-caisse-input');
        if (fInput) this.state.fondCaisse = parseFloat(fInput.value) || 0;

        let brut = 0;
        document.querySelectorAll('.cash-in').forEach(i => {
            brut += (parseFloat(i.dataset.unit) * (parseInt(i.value) || 0));
        });

        const net = brut - this.state.fondCaisse;

        const netDisp = document.getElementById('cash-net-display');
        if (netDisp) netDisp.textContent = net.toFixed(2);

        const g = id => parseFloat(document.getElementById(id)?.value) || 0;

        const totalCB = g('cb-contact-soir') + g('cb-sans-contact-soir');
        const totalTR = g('tr-contact-soir') + g('tr-sans-contact-soir');
        const totalAMEX = g('amex-contact-soir') + g('amex-sans-contact-soir');
        const totalMyPos = this.state.mypos.reduce((a, b) => a + b, 0);

        const dispCB = document.getElementById('total-cb-display');
        const dispTR = document.getElementById('total-tr-display');
        const dispAMEX = document.getElementById('total-amex-display');
        const dispMyPos = document.getElementById('total-mypos-display');

        if (dispCB) dispCB.textContent = totalCB.toFixed(2);
        if (dispTR) dispTR.textContent = totalTR.toFixed(2);
        if (dispAMEX) dispAMEX.textContent = totalAMEX.toFixed(2);
        if (dispMyPos) dispMyPos.textContent = totalMyPos.toFixed(2);

        this.updateList('mypos-recap-soir', this.state.mypos, 'mypos');
        this.updateList('checks-recap-soir', this.state.checks, 'checks');
        this.updateList('ancv-recap-soir', this.state.ancv, 'ancv', true);

        this.saveToStorage();
    },

    /**
     * Met à jour le HTML des mini-listes (MyPos, Chèques, ANCV)
     */
    updateList(id, data, typeKey, isAncv = false) {
        const el = document.getElementById(id);
        if (!el) return;

        el.innerHTML = data.map((v, i) => {
            const txt = isAncv
                ? `${v.type} ${v.qty}x${v.val}€`
                : `${typeKey.toUpperCase()} ${v}€`;

            return `
                <div class="list-item">
                    <span>${txt}</span>
                    <button onclick="app.removeItem('${typeKey}', ${i})">❌</button>
                </div>
            `;
        }).join('');
    },

    /**
     * Prépare les données et ouvre la modale récapitulative.
     * Différencie le calcul en fonction du service Midi/Soir.
     */
    openRecap() {
        const v = id => parseFloat(document.getElementById(id)?.value) || 0;
        const netVal = parseFloat(document.getElementById('cash-net-display')?.textContent) || 0;

        if (this.state.service === 'Midi') {
            this.lastExport = {
                service: 'Midi',
                cb: v('midi-cb'),
                tr: v('midi-tr'),
                mypos: v('midi-mypos'),
                cashNet: v('midi-cash'),
                ancvP: v('midi-ancv-p'),
                ancvC: v('midi-ancv-c'),
                checks: v('midi-checks'),
                pizzas_e: v('midi-piz-e'),
                pizzas_p: v('midi-piz-p'),
                tva5: v('midi-tva5'),
                tva10: v('midi-tva10'),
                tva20: v('midi-tva20'),
                posCashLogiciel: v('midi-cash'),
                deltaCash: 0
            };
        } else {
            const oldExport = this.lastExport || {};

            const recapPizE = parseFloat(document.getElementById('recap-piz-e')?.value);
            const recapPizP = parseFloat(document.getElementById('recap-piz-p')?.value);
            const recapTva5 = parseFloat(document.getElementById('recap-tva5')?.value);
            const recapTva10 = parseFloat(document.getElementById('recap-tva10')?.value);
            const recapTva20 = parseFloat(document.getElementById('recap-tva20')?.value);

            this.lastExport = {
                service: 'Soir',
                cb: v('cb-contact-soir') + v('cb-sans-contact-soir') + v('amex-contact-soir') + v('amex-sans-contact-soir'),
                tr: v('tr-contact-soir') + v('tr-sans-contact-soir'),
                mypos: this.state.mypos.reduce((a, b) => a + b, 0),
                cashNet: netVal,
                ancvP: this.state.ancv
                    .filter(i => i.type === 'Papier')
                    .reduce((a, b) => a + (b.val * b.qty), 0),
                ancvC: this.state.ancv
                    .filter(i => i.type === 'Connect')
                    .reduce((a, b) => a + (b.val * b.qty), 0),
                checks: this.state.checks.reduce((a, b) => a + b, 0),
                pizzas_e: isNaN(recapPizE) ? (oldExport.pizzas_e || 0) : recapPizE,
                pizzas_p: isNaN(recapPizP) ? (oldExport.pizzas_p || 0) : recapPizP,
                tva5: isNaN(recapTva5) ? (oldExport.tva5 || 0) : recapTva5,
                tva10: isNaN(recapTva10) ? (oldExport.tva10 || 0) : recapTva10,
                tva20: isNaN(recapTva20) ? (oldExport.tva20 || 0) : recapTva20,
                posCashLogiciel: v('pos-cash-soir')
            };

            this.lastExport.deltaCash = parseFloat(
                (this.lastExport.cashNet - this.lastExport.posCashLogiciel).toFixed(2)
            );
        }

        this.renderFinalRecap(this.lastExport);
    },

    /**
     * Génère dynamiquement l'interface HTML de la modale récapitulative
     * Initialise la modale dans un état vierge (pas d'erreur affichée).
     */
    renderFinalRecap(f) {
        const title = (f.service === 'Midi') ? 'VÉRIFICATION MIDI' : 'CLÔTURE SOIR';
        const row = (l, v) => `<div class="recap-row"><span>${l}</span><b>${(v || 0).toFixed(2)}€</b></div>`;

        const caTotal =
            (f.cb || 0) +
            (f.tr || 0) +
            (f.ancvP || 0) +
            (f.ancvC || 0) +
            (f.checks || 0) +
            (f.posCashLogiciel || 0);

        const submitLabel = (f.service === 'Midi')
            ? '💾 ARCHIVER LE MIDI'
            : '💾 ARCHIVER LE SERVICE';

        let html = `
            <div class="recap-list-final">
                <h2 style="margin:0 0 10px 0; border-bottom:2px solid #333;">${title}</h2>

                <div id="recap-error-box" class="error-box" style="display:none;">
                    ⚠️ TVA non conforme<br>
                    Encaissements : <span id="err-enc"></span>€<br>
                    TVA : <span id="err-tva"></span>€<br>
                    Écart : <span id="err-ecart"></span>€
                </div>

                ${row("Esp. Logiciel (Z)", f.posCashLogiciel)}
                ${row("CB + AMEX", f.cb)}
                ${row("CB TR", f.tr)}
                ${row("Chèques", f.checks)}
                ${row("ANCV P.", f.ancvP)}
                ${row("ANCV C.", f.ancvC)}

                <div style="margin:10px 0; padding:10px; background:#f1f5f9; border-radius:5px;">
                    ${row("Esp. Réel (Compté)", f.cashNet)}
                    ${row("MyPos", f.mypos)}
                    <div class="recap-row" style="margin-top:5px; border-top:1px dashed #ccc;">
                        <span>ÉCART</span>
                        <b style="color:${f.deltaCash < 0 ? '#dc2626' : '#16a34a'}">
                            ${(f.deltaCash || 0).toFixed(2)}€
                        </b>
                    </div>
                </div>
        `;

        if (f.service === 'Midi') {
            html += `
                <div style="margin:10px 0; padding:10px; background:#f1f5f9; border-radius:5px;">
                    <div class="recap-row"><span>🍕 Emportées</span><b>${f.pizzas_e || 0}</b></div>
                    <div class="recap-row"><span>🍕 Sur place</span><b>${f.pizzas_p || 0}</b></div>
                </div>

                <div style="margin:10px 0; padding:10px; background:#f1f5f9; border-radius:5px;">
                    ${row("TVA 5,5%", f.tva5)}
                    ${row("TVA 10%", f.tva10)}
                    ${row("TVA 20%", f.tva20)}
                </div>
            `;
        } else {
            html += `
                <div style="margin:10px 0; padding:10px; background:#f1f5f9; border-radius:5px;">
                    <h3 style="margin:0 0 8px 0; font-size:1rem;">Fréquentation</h3>

                    <div style="display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:8px;">
                        <div>
                            <label for="recap-piz-e" style="display:block; font-size:0.78rem; margin-bottom:4px; text-align:center;">Emportées</label>
                            <input
                                type="number"
                                id="recap-piz-e"
                                value="${f.pizzas_e || 0}"
                                inputmode="numeric"
                                step="1"
                                oninput="app.updateModalValidation()"
                                style="width:100%; padding:6px 4px; font-size:0.88rem; min-height:34px; text-align:center;"
                            >
                        </div>

                        <div>
                            <label for="recap-piz-p" style="display:block; font-size:0.78rem; margin-bottom:4px; text-align:center;">Couverts</label>
                            <input
                                type="number"
                                id="recap-piz-p"
                                value="${f.pizzas_p || 0}"
                                inputmode="numeric"
                                step="1"
                                oninput="app.updateModalValidation()"
                                style="width:100%; padding:6px 4px; font-size:0.88rem; min-height:34px; text-align:center;"
                            >
                        </div>
                    </div>
                </div>

                <div style="margin:10px 0; padding:10px; background:#f1f5f9; border-radius:5px;">
                    <h3 style="margin:0 0 8px 0; font-size:1rem;">TTC par taux</h3>

                    <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px; width:100%;">
                        <div style="min-width:0; width:100%;">
                            <label for="recap-tva5" style="display:block; font-size:0.78rem; margin-bottom:4px; text-align:center;">TVA 5,5%</label>
                            <input
                                type="number"
                                id="recap-tva5"
                                value="${f.tva5 || 0}"
                                inputmode="decimal"
                                step="any"
                                oninput="app.updateModalValidation()"
                                style="display:block; width:100%; min-width:0; max-width:100%; box-sizing:border-box; padding:6px 2px; font-size:0.88rem; min-height:34px; text-align:center;"
                            >
                        </div>

                        <div style="min-width:0; width:100%;">
                            <label for="recap-tva10" style="display:block; font-size:0.78rem; margin-bottom:4px; text-align:center;">TVA 10%</label>
                            <input
                                type="number"
                                id="recap-tva10"
                                value="${f.tva10 || 0}"
                                inputmode="decimal"
                                step="any"
                                oninput="app.updateModalValidation()"
                                style="display:block; width:100%; min-width:0; max-width:100%; box-sizing:border-box; padding:6px 2px; font-size:0.88rem; min-height:34px; text-align:center;"
                            >
                        </div>

                        <div style="min-width:0; width:100%;">
                            <label for="recap-tva20" style="display:block; font-size:0.78rem; margin-bottom:4px; text-align:center;">TVA 20%</label>
                            <input
                                type="number"
                                id="recap-tva20"
                                value="${f.tva20 || 0}"
                                inputmode="decimal"
                                step="any"
                                oninput="app.updateModalValidation()"
                                style="display:block; width:100%; min-width:0; max-width:100%; box-sizing:border-box; padding:6px 2px; font-size:0.88rem; min-height:34px; text-align:center;"
                            >
                        </div>
                    </div>
                </div>
            `;
        }

        html += `
                <div class="recap-row" style="background:#334155; padding:8px; border-radius:5px;">
                    <span style="color:#f8fafc;">CA TOTAL RÉEL</span>
                    <b style="color:#ffffff;">${caTotal.toFixed(2)}€</b>
                </div>
            </div>

            <button
                class="btn-primary"
                style="margin-top:15px; width:100%;"
                onclick="app.confirmRecapAndSend()"
            >
                ${submitLabel}
            </button>
        `;

        // Réinitialisation de la classe de la modale à l'ouverture (on retire le rouge)
        const modalContent = document.querySelector('#modal-recap .modal-content');
        if (modalContent) {
            modalContent.classList.remove('recap-error');
        }

        document.getElementById('recap-body').innerHTML = html;
        document.getElementById('modal-recap').classList.remove('hidden');
    },

    /**
     * NOUVEAU COMPORTEMENT: Ne déclenche plus de validation punitive pendant la saisie.
     * Retire simplement l'indicateur d'erreur visuel dès que l'utilisateur commence à modifier une valeur,
     * l'invitant ainsi à re-soumettre sa correction.
     */
    updateModalValidation() {
        if (this.state.service === 'Soir') {
            const v = id => parseFloat(document.getElementById(id)?.value) || 0;
            this.lastExport.pizzas_e = v('recap-piz-e');
            this.lastExport.pizzas_p = v('recap-piz-p');
            this.lastExport.tva5 = v('recap-tva5');
            this.lastExport.tva10 = v('recap-tva10');
            this.lastExport.tva20 = v('recap-tva20');
        }

        // Retire le fond rouge dès qu'on touche à une case pour signifier le mode "édition"
        const modalContent = document.querySelector('#modal-recap .modal-content');
        if (modalContent && modalContent.classList.contains('recap-error')) {
            modalContent.classList.remove('recap-error');
            const errorBox = document.getElementById('recap-error-box');
            if (errorBox) errorBox.style.display = 'none';
        }
    },

    /**
     * Vérifie la validité des données AU MOMENT du clic sur l'archivage.
     * Si les comptes sont mauvais, la modale devient rouge et bloque l'envoi.
     * Si c'est bon, lance la requête réseau.
     */
    confirmRecapAndSend() {
        // MAJ des valeurs juste avant l'envoi
        if (this.state.service === 'Soir') {
            this.lastExport.pizzas_e = parseFloat(document.getElementById('recap-piz-e')?.value) || 0;
            this.lastExport.pizzas_p = parseFloat(document.getElementById('recap-piz-p')?.value) || 0;
            this.lastExport.tva5 = parseFloat(document.getElementById('recap-tva5')?.value) || 0;
            this.lastExport.tva10 = parseFloat(document.getElementById('recap-tva10')?.value) || 0;
            this.lastExport.tva20 = parseFloat(document.getElementById('recap-tva20')?.value) || 0;
        }

        const validation = this.validateRecapBeforeSend();

        // Si l'écart de TVA n'est pas nul -> on punit visuellement et on annule l'envoi
        if (!validation.ok) {
            const modalContent = document.querySelector('#modal-recap .modal-content');
            if (modalContent) modalContent.classList.add('recap-error');

            const errorBox = document.getElementById('recap-error-box');
            if (errorBox) {
                errorBox.style.display = 'block';
                const errEnc = document.getElementById('err-enc');
                const errTva = document.getElementById('err-tva');
                const errEcart = document.getElementById('err-ecart');
                
                if (errEnc) errEnc.textContent = validation.totalEncaissements.toFixed(2);
                if (errTva) errTva.textContent = validation.totalTva.toFixed(2);
                if (errEcart) errEcart.textContent = validation.ecart.toFixed(2);
            }
            return; // Bloque l'exécution de la suite
        }

        // Si tout est validé, on procède à l'envoi
        this.send();
    },

    /**
     * Compare mathématiquement le total des encaissements et les TVA associées.
     * Retourne le statut de validité complet pour influencer l'UI.
     */
    validateRecapBeforeSend() {
        if (!this.lastExport) {
            return {
                ok: false,
                totalEncaissements: 0,
                totalTva: 0,
                ecart: 0
            };
        }

        const totalEncaissements = parseFloat((
            (this.lastExport.posCashLogiciel || 0) +
            (this.lastExport.cb || 0) +
            (this.lastExport.tr || 0) +
            (this.lastExport.checks || 0) +
            (this.lastExport.ancvP || 0) +
            (this.lastExport.ancvC || 0)
        ).toFixed(2));

        const totalTva = parseFloat((
            (this.lastExport.tva5 || 0) +
            (this.lastExport.tva10 || 0) +
            (this.lastExport.tva20 || 0)
        ).toFixed(2));

        const ecart = parseFloat((totalEncaissements - totalTva).toFixed(2));

        return {
            ok: ecart === 0,
            totalEncaissements,
            totalTva,
            ecart
        };
    },

    /**
     * Processus d'envoi des données validées vers l'API externe (Google Script).
     * Gère l'état d'envoi pour éviter les doublons et assure le nettoyage final.
     */
    send() {
        if (this.isSending) return;
        this.isSending = true;

        const btn = document.querySelector('#modal-recap .btn-primary');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = "⌛ Envoi...";
        }

        const dataToSend = JSON.parse(JSON.stringify(this.lastExport));
        const serviceEnCours = this.state.service;

        const params = new URLSearchParams({
            payload: JSON.stringify(dataToSend)
        });
        const url = `${this.CONFIG.SCRIPT_URL}?${params.toString()}`;

        fetch(url, { method: 'GET', mode: 'no-cors' })
            .then(() => {
                this.isSending = false;

                if (serviceEnCours === 'Midi') {
                    alert("✅ Midi archivé !");
                    this.state.ancv = [];
                    this.state.checks = [];
                    this.state.mypos = [];
                    this.saveToStorage();
                    this.setService('Soir');
                    this.closeRecap();
                    location.reload();
                } else {
                    this.closeRecap();
                    this.state.ancv = [];
                    this.state.checks = [];
                    this.state.mypos = [];
                    localStorage.removeItem('vesuvio_v29');

                    if (typeof FondCaisseModule !== 'undefined') {
                        FondCaisseModule.showFinalGuide();
                    } else {
                        location.reload();
                    }
                }
            })
            .catch(() => {
                alert("Erreur d'envoi");
                this.isSending = false;

                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = (serviceEnCours === 'Midi')
                        ? "💾 ARCHIVER LE MIDI"
                        : "💾 ARCHIVER LE SERVICE";
                }
            });
    },

    /**
     * Masque le modal récapitulatif sans l'effacer du DOM.
     */
    closeRecap() {
        document.getElementById('modal-recap').classList.add('hidden');
    },

    /**
     * Sérialise et sauvegarde l'état actuel de la caisse dans le LocalStorage.
     */
    saveToStorage() {
        localStorage.setItem('vesuvio_v29', JSON.stringify(this.state));
    },

    /**
     * Charge l'état de la caisse depuis le LocalStorage au démarrage.
     * Injecte un état d'usine sécurisé en cas d'erreur de parse.
     */
    loadFromStorage() {
        try {
            const raw = localStorage.getItem('vesuvio_v29');
            if (!raw) {
                this.state = {
                    service: 'Midi',
                    ancv: [],
                    checks: [],
                    mypos: [],
                    fondCaisse: 134.00
                };
                return;
            }

            const s = JSON.parse(raw);

            this.state = {
                service: (s?.service === 'Soir') ? 'Soir' : 'Midi',
                ancv: Array.isArray(s?.ancv) ? s.ancv : [],
                checks: Array.isArray(s?.checks) ? s.checks : [],
                mypos: Array.isArray(s?.mypos) ? s.mypos : [],
                fondCaisse: Number.isFinite(parseFloat(s?.fondCaisse)) ? parseFloat(s.fondCaisse) : 134.00
            };
        } catch (e) {
            this.state = {
                service: 'Midi',
                ancv: [],
                checks: [],
                mypos: [],
                fondCaisse: 134.00
            };
        }
    },

    /**
     * Attache les écouteurs d'événements globaux à l'application.
     * Inclut le nettoyage du zéro sur focus des inputs.
     */
    bindEvents() {
        document.addEventListener('input', () => this.refreshUI());

        document.addEventListener('focusin', (e) => {
            if (e.target.tagName === 'INPUT' && e.target.value === '0') {
                e.target.value = '';
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
