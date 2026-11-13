import type { QuoteStatus, RfqStatus } from '@/lib/types';

const RFQ: Record<RfqStatus, [string, string]> = {
  OPEN: ['Open', 'st-live'],
  AWARDED: ['Awarded', 'st-live'],
  CLOSED: ['Closed', 'st-draft'],
  EXPIRED: ['Expired', 'st-draft'],
};

const QUOTE: Record<QuoteStatus, [string, string]> = {
  SUBMITTED: ['Quote sent', 'st-wait'],
  WITHDRAWN: ['Withdrawn', 'st-draft'],
  AWARDED: ['You won', 'st-live'],
  NOT_SELECTED: ['Not selected', 'st-bad'],
};

export function RfqStatusPill({ status }: { status: RfqStatus }) {
  const [label, cls] = RFQ[status];
  return <span className={`st ${cls}`}>{label}</span>;
}

export function QuoteStatusPill({ status }: { status: QuoteStatus }) {
  const [label, cls] = QUOTE[status];
  return <span className={`st ${cls}`}>{label}</span>;
}
