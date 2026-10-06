/**
 * Monograma TM com pincel (conceito 02, gerado com IA e mantido como foi desenhado).
 * Desenhado por máscara: a cor vem do `currentColor` (ex.: text-champanhe).
 */
export function Monograma({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block aspect-[488/372] bg-current [mask-image:url(/marca/monograma.png)] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain] ${className}`}
    />
  );
}
