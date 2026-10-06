/** Simulações por dia (PRD 7.1): 1 sem conta, 5 com conta, +10 com reserva. Foto recusada não conta. */
export function limiteDeSimulacoes(p: { logada: boolean; comReserva: boolean }): number {
  if (!p.logada) return 1;
  return p.comReserva ? 15 : 5;
}

export function podeSimular(p: { usadasHoje: number; logada: boolean; comReserva: boolean }): boolean {
  return p.usadasHoje < limiteDeSimulacoes(p);
}
