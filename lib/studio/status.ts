import type { TomStatus } from "@/lib/cliente/reservas";
import type { StatusReserva } from "@/lib/domain/reserva";

/** Na visão da Thalita os nomes de status falam de ação, não de espera. */
export const STATUS_STUDIO: Record<StatusReserva, { texto: string; tom: TomStatus }> = {
  orcamento: { texto: "Definir deslocamento", tom: "alerta" },
  solicitada: { texto: "Novo pedido", tom: "alerta" },
  aguardando_sinal: { texto: "Aguardando o sinal", tom: "neutro" },
  confirmada: { texto: "Confirmada", tom: "sucesso" },
  realizada: { texto: "Realizada", tom: "neutro" },
  expirada: { texto: "Sinal não pago", tom: "erro" },
  cancelada_cliente: { texto: "Cancelada pela cliente", tom: "neutro" },
  cancelada_profissional: { texto: "Recusada", tom: "neutro" },
};
