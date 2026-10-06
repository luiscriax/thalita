import { PaginaLegal, metadadosLegais } from "@/components/legal/pagina-legal";

export const metadata = metadadosLegais("termos");

export default function Pagina() {
  return <PaginaLegal slug="termos" />;
}
