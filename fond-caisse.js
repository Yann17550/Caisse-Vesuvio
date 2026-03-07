/**
 * CALCULATEUR DE RÉASSORT AUTOMATIQUE - LE VESUVIO
 */
const FondCaisseModule = {
    // Ta configuration cible (Le fond de caisse idéal de 134€)
    BASES: [
        { u: 20, q: 2 }, { u: 10, q: 4 }, { u: 5, q: 4 },
        { u: 2, q: 10 }, { u: 1, q: 10 }, { u: 0.5, q: 5 },
        { u: 0.2, q: 5 }, { u: 0.1, q: 5 }
    ],

    showFinalGuide() {
        // RÉCUPÉRATION AUTOMATIQUE : On lit les inputs de ta grille d'espèces actuelle
        const inputs = document.querySelectorAll('.cash-in');
        let currentCounts = {};
        inputs.forEach(input => {
            // On récupère l'unité (ex: 20) et la quantité que tu viens de taper (ex: 5)
            currentCounts[input.dataset.unit] = parseInt(input.value) || 0;
        });

        let html = `
            <div id="modal-fond-final" class="modal" style="display:flex; align-items:center; justify-content:center;">
                <div class="modal-content" style="border: 4px solid #4f46e5; max-width:450px; width:90%;">
                    <h2 style="text-align:center; color:#1e293b; margin-bottom:5px;">📥 PRÉPA. FOND DE CAISSE</h2>
                    <p style="text-align:center; font-size:0.9rem; color:#475569; margin-bottom:20px;">
                        Complétez le tiroir pour revenir à <b>134.00€</b>
                    </p>
                    
                    <div style="background:#f8fafc; border-radius:12px; padding:15px; border:1px solid #e2e8f0;">
                        <table style="width:100%; border-collapse: collapse;">
                            <thead>
                                <tr style="font-size:0.75rem; color:#64748b; text-transform:uppercase; border-bottom:2px solid #cbd5e1;">
                                    <th style="text-align:left; padding-bottom:10px;">Billet/Pièce</th>
                                    <th style="text-align:right; padding-bottom:10px;">ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
        `;

        this.BASES.forEach(item => {
            const saisi = currentCounts[item.u] || 0; // Ce que tu as tapé dans la grille
            const cible = item.q; // Ce qu'il faut (2, 4, 10...)
            const diff = cible - saisi; // Ce qu'il manque ou ce qu'il y a en trop
            
            let actionText = "";
            let actionStyle = "";

            if (diff > 0) {
                // Il en manque
                actionText = `AJOUTER ${diff}`;
                actionStyle = "background:#ef4444; color:white; font-weight:900; padding:5px 10px; border-radius:6px;";
            } else if (diff < 0) {
                // Il y en a trop (on retire le surplus)
                actionText = `RETIRER ${Math.abs(diff)}`;
                actionStyle = "background:#10b981; color:white; font-weight:900; padding:5px 10px; border-radius:6px;";
            } else {
                // C'est pile poil
                actionText = "OK";
                actionStyle = "color:#94a3b8; font-weight:bold;";
            }

            html += `
                <tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="padding:15px 0; font-size:1.1rem; font-weight:bold; color:#1e293b;">${item.u} €</td>
                    <td style="text-align:right;">
                        <span style="${actionStyle}">${actionText}</span>
                    </td>
                </tr>
            `;
        });

        html += `
                            </tbody>
                        </table>
                    </div>

                    <div style="margin-top:20px; padding:15px; background:#4f46e5; border-radius:10px; text-align:center; color:white;">
                        <div style="font-size:0.8rem; opacity:0.9;">État Final du Tiroir</div>
                        <div style="font-size:1.5rem; font-weight:900;">134.00 €</div>
                    </div>

                    <button class="btn-primary" style="margin-top:20px; width:100%; height:55px; font-size:1.2rem;" onclick="location.reload()">
                        TERMINER & RÉINITIALISER
                    </button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    }
};
