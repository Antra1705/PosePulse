import { Spinner } from "../../components/Icons";

export default function Loading() {
  return (
    <div className="page-loading" role="status" aria-live="polite">
      <Spinner size={22} />
      <span>Loading coach…</span>
    </div>
  );
}
