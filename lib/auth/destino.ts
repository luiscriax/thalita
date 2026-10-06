/** Para onde mandar a pessoa depois do login: só caminhos do próprio app (evita redirecionamento aberto). */
export function destinoSeguro(next: string | null | undefined, origem: string, padrao = "/inicio"): string {
  if (!next) return padrao;
  try {
    const base = new URL(origem);
    const url = new URL(next, base);
    if (url.origin !== base.origin) return padrao;
    if (/^\/[\\/]/.test(next) || next.includes("\\")) return padrao;
    return url.pathname + url.search;
  } catch {
    return padrao;
  }
}

/** Depois de entrar: a profissional sem destino específico vai direto para o Studio (área de administração). */
export function destinoAposEntrar(destino: string, profissional: boolean): string {
  return profissional && destino === "/inicio" ? "/studio" : destino;
}
