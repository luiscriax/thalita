import { NavegacaoCliente } from "@/components/layout/navegacao-cliente";
import { SoNoCliente } from "@/components/layout/so-no-cliente";

export default function LayoutCliente({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-po pb-24 lg:pb-0">
      <NavegacaoCliente />
      <SoNoCliente>{children}</SoNoCliente>
    </div>
  );
}
