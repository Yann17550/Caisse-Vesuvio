/**
 * MODULE FOND DE CAISSE AUTOMATIQUE - LE VESUVIO
 */
const FondCaisseModule = {
    BASES: [
        { u: 20, q: 2 }, { u: 10, q: 4 }, { u: 5, q: 4 },
        { u: 2, q: 10 }, { u: 1, q: 10 }, { u: 0.5, q: 5 },
        { u: 0.2, q: 5 }, { u: 0.1, q: 5 }
    ],

    // Cette fonction sera appelée par app.js
    showFinalGuide() {
        const modalHtml = `
            <div id="modal-fond-final" class="modal" style="display:flex;">
                <div class="modal-content" style="border: 3px solid #fbbf24;">
                    <h2 style="color:#1e293b; text-align:center; margin-bottom:10px;">✅ ARCHIVAGE RÉUSSI</h2>
                    <h3 style="color:#ca8a04; text-align:center; font-size:1.1rem; margin-bottom:20px;">
                        Préparation du Fond de Caisse (134€)
                    </h3>
                    <div style="background:#f1f5f9; border-radius:15px; padding:15px;">
                        ${this.BASES.map(item => `
                            <div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #cbd5e1;">
                                <span style="font-weight:900; font-size:1.2rem;">${item.u}€</span>
                                <span style="background:#1e293b; color:white; padding:4px 12px; border-radius:20px; font-weight:bold;">
                                    Laisser ${item.q}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                    <div style="text-align:center; margin-top:20px; font-weight:900; font-size:1.3rem;">
                        TOTAL : 134.00€
                    </div>
                    <p style="text-align:center; color: #64748b; font-size:0.85rem; margin-top:10px;">
                        Retirez le surplus pour la banque.
                    </p>
                    <button class="btn-primary" style="margin-top:20px; width:100%;" onclick="location.reload()">
                        TERMINER & RÉINITIALISER
                    </button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
};
