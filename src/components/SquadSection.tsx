import { PendingTile } from "./PendingTile";
import type { SquadTile } from "@/lib/kpis";

export function SquadSection({
  title,
  tiles,
  note,
}: {
  title: string;
  tiles: SquadTile[];
  note?: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-[var(--text-primary)]">
        {title}
        {note && <span className="ml-2 text-sm font-normal text-[var(--text-muted)]">({note})</span>}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <PendingTile key={tile.id} label={tile.label} description={tile.description} target={tile.target} />
        ))}
      </div>
    </section>
  );
}
