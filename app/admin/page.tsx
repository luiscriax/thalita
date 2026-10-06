import { redirect } from "next/navigation";

/** Atalho fácil de lembrar para a Thalita: o Studio confere o acesso (sem login vai para /entrar). */
export default function Admin() {
  redirect("/studio");
}
