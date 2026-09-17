"use client";

import { useState } from "react";
import { TrainingCatalog } from "./training-catalog";
import { TrainingSessions } from "./training-sessions";
import { TrainingComplianceTable } from "./training-compliance-table";

export default function TreinamentosPage() {
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <div>
      <section className="section">
        <h2>Catálogo de treinamentos</h2>
        <p className="muted">
          Cadastre os treinamentos obrigatórios de SST, a periodicidade de reciclagem e os cargos que precisam fazer
          cada um (ou marque como obrigatório para todos os cargos).
        </p>
        <TrainingCatalog onChanged={() => setReloadKey((k) => k + 1)} />
      </section>

      <section className="section">
        <h2>Agenda de treinamentos</h2>
        <p className="muted">Sessões agendadas ou já realizadas, com a lista de participantes e a ata em PDF.</p>
        <TrainingSessions reloadKey={reloadKey} />
      </section>

      <section className="section">
        <h2>Situação por colaborador</h2>
        <p className="muted">
          Calculado a partir da última sessão em que cada colaborador constou como presente e da periodicidade do
          treinamento.
        </p>
        <TrainingComplianceTable reloadKey={reloadKey} />
      </section>
    </div>
  );
}
