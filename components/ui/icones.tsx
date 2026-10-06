// Ícones de traço único (1,8), desenhados para o app. Uso: <Icone nome="camera" className="size-5" />
const caminhos = {
  voltar: "m15 5-7 7 7 7",
  avancar: "m9 5 7 7-7 7",
  fechar: "M6 6l12 12M18 6 6 18",
  camera: "M4 8.5A2.5 2.5 0 0 1 6.5 6h1.6l1.4-2h5l1.4 2h1.6A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5zM12 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
  rosto: "M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M8 14s1.5 2 4 2 4-2 4-2M9 9.5h.01M15 9.5h.01",
  enviar: "M12 16V4m0 0-4 4m4-4 4 4M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3",
  microfone: "M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zM6 11a6 6 0 0 0 12 0M12 17v3",
  calendario: "M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM4 10h16M8 4v4M16 4v4",
  relogio: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  local: "M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  casa: "M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z",
  looks: "M12 20.5S3.5 15 3.5 9A4.5 4.5 0 0 1 12 6.5 4.5 4.5 0 0 1 20.5 9c0 6-8.5 11.5-8.5 11.5z",
  usuario: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0",
  check: "m5 12.5 4.5 4.5L19 7.5",
  copiar: "M9 9h10v10H9zM5 15V5h10",
  whatsapp: "M20 11.6A8.4 8.4 0 0 1 7.6 19L4 20l1.1-3.4A8.4 8.4 0 1 1 20 11.6zM9 8.5c0 3 2.5 6.5 6.5 6.5l1-1.5-2-1-1 1c-1-.5-2-1.5-2.5-2.5l1-1-1-2z",
  sino: "M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20h4",
  sair: "M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h9",
  lixeira: "M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12",
  editar: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  mais: "M12 5v14M5 12h14",
  menos: "M5 12h14",
  ajustes: "M4 7h10M18 7h2M4 17h4M12 17h8M14 4v6M8 14v6",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5h.01",
  ajuda: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01",
  escudo: "M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z",
  pedidos: "M7 4h10a1 1 0 0 1 1 1v15l-3-2-3 2-3-2-3 2V5a1 1 0 0 1 1-1zM9 9h6M9 13h4",
  acervo: "M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v6H4zM13 14h7v6h-7z",
  pix: "M12 3.5 20.5 12 12 20.5 3.5 12zM8.5 12 12 8.5 15.5 12 12 15.5z",
  pincel: "M14 4l6 6-8 8H6v-6zM5 19l2-2",
  estrela: "m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.6-4.8 2.6.9-5.4-3.9-3.8 5.4-.8z",
  sol: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  wifi: "M3 9a13 13 0 0 1 18 0M6 12.5a8.5 8.5 0 0 1 12 0M9 16a4 4 0 0 1 6 0M12 19.5h.01M4 4l16 16",
  baixar: "M12 4v12m0 0-4-4m4 4 4-4M4 19h16",
  pausa: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM10 9v6M14 9v6",
  olho: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
} as const;

export type NomeIcone = keyof typeof caminhos;

export function Icone({ nome, className = "size-5", rotulo }: { nome: NomeIcone; className?: string; rotulo?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} role={rotulo ? "img" : undefined} aria-label={rotulo} aria-hidden={rotulo ? undefined : true}>
      <path d={caminhos[nome]} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
