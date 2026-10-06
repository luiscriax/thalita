import { PaginaLegal, metadadosLegais } from "@/components/legal/pagina-legal";

export const metadata = metadadosLegais("sua-foto");

export default function Pagina() {
  return <PaginaLegal slug="sua-foto" />;
}
