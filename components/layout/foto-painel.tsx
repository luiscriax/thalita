"use client";

import Image from "next/image";

/**
 * Foto do painel lateral (computador). Ao trocar de imagem, a nova entra esmaecendo
 * só depois de carregar (senão a transição termina antes de a foto aparecer em conexão lenta).
 */
export function FotoPainel({ imagem, foco }: { imagem: string; foco?: string }) {
  return (
    <Image
      key={imagem}
      src={imagem}
      alt=""
      fill
      priority
      sizes="(min-width: 1024px) 50vw, 0px"
      onLoad={(e) => e.currentTarget.setAttribute("data-carregada", "")}
      className="object-cover opacity-0 transition-opacity duration-500 data-[carregada]:opacity-100 motion-reduce:transition-none"
      style={{ objectPosition: foco ?? "50% 30%" }}
    />
  );
}
