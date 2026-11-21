/** "+ Compare" on a product: puts it in the comparison and opens it. A plain form post, no script needed. */
export function CompareButton({ slug, className = 'btn btn-line btn-sm' }: { slug: string; className?: string }) {
  return (
    <form action="/compare/update" method="post">
      <input type="hidden" name="op" value="add" />
      <input type="hidden" name="slug" value={slug} />
      <button type="submit" className={className}>⚖ Compare</button>
    </form>
  );
}
