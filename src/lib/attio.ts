import "server-only";

const ATTIO_API_BASE = "https://api.attio.com/v2";

export type CountResult = { count: number | null; error?: string };

/**
 * Counts entries in an Attio list whose status attribute matches a given value.
 * Requires ATTIO_API_KEY (a read-only Attio API token) as an env var — set it
 * directly in Railway, never commit it.
 *
 * Attio's list-entries query endpoint doesn't return a total count, so this
 * fetches up to 500 matching entries and counts them directly.
 */
export async function countListEntriesByStatus(
  list: string,
  statusAttribute: string,
  statusValue: string,
): Promise<CountResult> {
  const apiKey = process.env.ATTIO_API_KEY;
  if (!apiKey) {
    return { count: null, error: "ATTIO_API_KEY no configurada en Railway" };
  }

  try {
    const res = await fetch(`${ATTIO_API_BASE}/lists/${list}/entries/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filter: { [statusAttribute]: { "$eq": statusValue } },
        limit: 500,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text();
      return { count: null, error: `Attio API ${res.status}: ${body.slice(0, 200)}` };
    }

    const json = (await res.json()) as { data?: unknown[] };
    return { count: json.data?.length ?? 0 };
  } catch (err) {
    return { count: null, error: err instanceof Error ? err.message : "Error desconocido" };
  }
}
