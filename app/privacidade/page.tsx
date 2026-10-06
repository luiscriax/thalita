import { PaginaLegal, metadadosLegais } from "@/components/legal/pagina-legal";

export const metadata = metadadosLegais("privacidade");

export default function Pagina() {
  return <PaginaLegal slug="privacidade" />;
}
