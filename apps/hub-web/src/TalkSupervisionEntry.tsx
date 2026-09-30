export function TalkSupervisionEntry({ href, sellerCount }: { href: string; sellerCount: number }) {
  return <section className="product-section" aria-label="Supervisão do Talk">
    <div className="section-hd"><span className="section-hd__title">Supervisão</span></div>
    <article className="pcard">
      <div className="pcard__top"><span className="pcard__badge pcard__badge--active">Liberado</span></div>
      <div className="pcard__cat">Talk · somente leitura</div>
      <div className="pcard__name">Supervisão do Talk</div>
      <p className="pcard__desc">Acompanhe as conversas de {sellerCount} {sellerCount === 1 ? "vendedor vinculado" : "vendedores vinculados"}.</p>
      <div className="pcard__footer"><a className="pcard__btn pcard__btn--gold" href={href}>Abrir supervisão</a></div>
    </article>
  </section>;
}
