'use client';

import { useEffect, useId, useRef, useState } from 'react';

/**
 * "Get Best Price" / "Send Inquiry" / "Post Requirement". Opens the requirement form.
 * Sending is switched on in the RFQ step (it needs the RFQ API); until then the
 * form says so instead of pretending to send.
 */
export function LeadButton({
  label,
  product,
  supplier,
  className = 'btn btn-orange',
  title = 'Get the best price from verified suppliers',
}: {
  label: string;
  product?: string;
  supplier?: string;
  className?: string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const first = useRef<HTMLInputElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function close() {
    setOpen(false);
    btn.current?.focus();
  }

  return (
    <>
      <button ref={btn} type="button" className={className} onClick={() => setOpen(true)}>
        {label}
      </button>
      {open && (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={(e) => e.target === e.currentTarget && close()}>
          <div className="box">
            <div className="top">
              <div>
                <b>{product ?? 'Your requirement'}</b>
                <small>{supplier ? `Supplier: ${supplier}` : 'We match you with verified suppliers'}</small>
              </div>
              <button className="close" type="button" aria-label="Close" onClick={close}>×</button>
            </div>
            <form onSubmit={(e) => e.preventDefault()}>
              <h3 id={titleId} style={{ fontSize: 17 }}>{title}</h3>
              <div className="row2">
                <div className="f"><label htmlFor={`${titleId}-q`}>Quantity</label><input ref={first} id={`${titleId}-q`} inputMode="numeric" placeholder="e.g. 200" /></div>
                <div className="f">
                  <label htmlFor={`${titleId}-u`}>Unit</label>
                  <select id={`${titleId}-u`}><option>Piece</option><option>Set</option><option>Kg</option><option>Tonne</option><option>Box</option></select>
                </div>
              </div>
              <div className="f"><label htmlFor={`${titleId}-r`}>Requirement details</label><textarea id={`${titleId}-r`} placeholder="Size, material, grade, delivery city" /></div>
              <p className="notice" role="note">
                Sending requirements to suppliers opens in the next release (RFQs). Nothing is sent from this form yet.
              </p>
              <button className="btn btn-orange btn-lg" type="submit" disabled>Get Best Price</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
