"use client";

import { useState } from "react";
import { Folha } from "@/components/ui/folha";
import { Botao, Campo } from "@/components/ui/marca";
import { mensagemDeErroLogin } from "@/lib/auth/erros";
import { supabaseNavegador } from "@/lib/supabase/navegador";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;


/** Estado e ações do login sem senha: e-mail → código de 6 dígitos (ou o link do e-mail), ou Google. */
export function useEntrar({ proximo, aoEntrar, emailInicial = "" }: { proximo: string; aoEntrar: (email: string, conta: { profissional: boolean }) => void; emailInicial?: string }) {
  const [etapa, setEtapa] = useState<"email" | "codigo">("email");
  const [email, setEmail] = useState(emailInicial);
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const supabase = supabaseNavegador();
  const retorno = (rota: string) => `${window.location.origin}${rota}?next=${encodeURIComponent(proximo)}`;

  async function enviarCodigo() {
    setErro(null);
    setCarregando(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: retorno("/auth/callback"), shouldCreateUser: true } });
    setCarregando(false);
    if (error) return setErro(mensagemDeErroLogin(error));
    setEtapa("codigo");
  }

  async function confirmarCodigo() {
    setErro(null);
    setCarregando(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: codigo, type: "email" });
    if (error) {
      setCarregando(false);
      return setErro(mensagemDeErroLogin(error));
    }
    type Conta = { profissional?: boolean };
    const conta: Conta = await fetch("/api/conta/garantir", { method: "POST" })
      .then((r) => (r.ok ? (r.json() as Promise<Conta>) : {}))
      .catch(() => ({}));
    setCarregando(false);
    aoEntrar(email, { profissional: !!conta.profissional });
  }

  async function entrarComGoogle() {
    setErro(null);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: retorno("/auth/callback") } });
    if (error) setErro(mensagemDeErroLogin(error));
  }

  function trocarEmail() {
    setEtapa("email");
    setCodigo("");
    setErro(null);
  }

  return { etapa, email, setEmail, codigo, setCodigo, erro, carregando, enviarCodigo, confirmarCodigo, entrarComGoogle, trocarEmail };
}

type Entrar = ReturnType<typeof useEntrar>;

/** Campos do login, sem moldura: vai dentro da folha ou direto na página /entrar. */
export function FormularioEntrar({ entrar, apoio = "Sem senha: você recebe um código no e-mail." }: { entrar: Entrar; apoio?: string }) {
  const { etapa, email, setEmail, codigo, setCodigo, erro, carregando, enviarCodigo, confirmarCodigo, entrarComGoogle, trocarEmail } = entrar;
  return etapa === "email" ? (
    <form onSubmit={(e) => { e.preventDefault(); if (EMAIL.test(email)) enviarCodigo(); }}>
      <p className="text-sm text-terra text-pretty">{apoio}</p>
      {/* E-mail é o caminho principal (sem senha); o Google vem como alternativa logo abaixo. */}
      <div className="mt-4">
        <Campo id="entrar-email" name="email" rotulo="Seu e-mail" type="email" inputMode="email" autoComplete="email" spellCheck={false} placeholder="voce@email.com" value={email} onChange={(e) => setEmail(e.target.value.trim())} erro={erro ?? undefined} />
      </div>
      <div className="mt-4">
        <Botao type="submit" disabled={!EMAIL.test(email)} carregando={carregando}>Receber código</Botao>
      </div>
      <div className="my-4 flex items-center gap-3 text-xs text-terra" aria-hidden="true">
        <span className="h-px flex-1 bg-nude-2" />ou<span className="h-px flex-1 bg-nude-2" />
      </div>
      <Botao type="button" variante="secundario" onClick={entrarComGoogle}>
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
          <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" />
          <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z" />
          <path fill="#FBBC05" d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2z" />
          <path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10C7.2 7.7 9.4 6 12 6z" />
        </svg>
        Continuar com Google
      </Botao>
    </form>
  ) : (
    <form onSubmit={(e) => { e.preventDefault(); if (codigo.length === 6) confirmarCodigo(); }}>
      <p className="text-sm text-terra text-pretty">Mandamos um código para <span className="font-medium text-cacau">{email}</span>. Digite aqui ou toque no link do e-mail.</p>
      <div className="mt-4">
        <Campo
          id="entrar-codigo"
          name="codigo"
          rotulo="Código de 6 dígitos"
          inputMode="numeric"
          autoComplete="one-time-code"
          spellCheck={false}
          className="tabular-nums tracking-[0.3em]"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
          erro={erro ?? undefined}
        />
      </div>
      <div className="mt-5 space-y-2">
        <Botao type="submit" disabled={codigo.length !== 6} carregando={carregando}>Entrar</Botao>
        <Botao type="button" variante="texto" onClick={trocarEmail}>Usar outro e-mail</Botao>
      </div>
    </form>
  );
}

/** Login dentro de uma folha, para quando ele aparece no meio do fluxo (2ª simulação, resumo do pedido). */
export function FolhaEntrar({ aberta, aoFechar, aoEntrar, proximo, titulo = "Para acompanhar o seu pedido", emailInicial = "" }: {
  aberta: boolean;
  aoFechar: () => void;
  aoEntrar: (email: string, conta: { profissional: boolean }) => void;
  proximo: string;
  titulo?: string;
  emailInicial?: string;
}) {
  const entrar = useEntrar({ proximo, aoEntrar, emailInicial });
  return (
    <Folha aberta={aberta} aoFechar={aoFechar} titulo={entrar.etapa === "email" ? titulo : "Confira o seu e-mail"}>
      <FormularioEntrar entrar={entrar} />
    </Folha>
  );
}
