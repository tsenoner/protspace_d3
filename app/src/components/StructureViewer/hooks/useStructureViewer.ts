import { useCallback, useEffect, useRef, useState } from "react";
import {
  createMolstarViewer,
  ensureMolstarResourcesLoaded,
  type MolstarViewer,
} from "../molstar-loader";

export interface UseStructureViewerState {
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to manage Mol* viewer lifecycle and structure loading from AlphaFold/PDB.
 * Keeps behavior aligned with the current component while separating logic.
 */
export function useStructureViewer(proteinId: string | null) {
  const [state, setState] = useState<UseStructureViewerState>({ isLoading: true, error: null });
  const viewerRef = useRef<MolstarViewer | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastLoadedIdRef = useRef<string | null>(null);
  const apiControllerRef = useRef<AbortController | null>(null);

  const cleanup = useCallback(() => {
    try {
      apiControllerRef.current?.abort();
    } catch {}
    apiControllerRef.current = null;
    try {
      viewerRef.current?.dispose?.();
    } catch {}
    viewerRef.current = null;
    if (containerRef.current) containerRef.current.innerHTML = "";
  }, []);

  useEffect(() => {
    if (!proteinId || !containerRef.current) return;

    // Normalize ID: strip isoform and variant suffixes like ".1" or "-2"
    const formattedId = proteinId.split(/[.\-]/)[0];
    let isCancelled = false;

    async function run() {
      setState({ isLoading: true, error: null });

      try {
        // Skip reload if same id and viewer exists
        if (lastLoadedIdRef.current === formattedId && viewerRef.current) {
          setState({ isLoading: false, error: null });
          return;
        }

        cleanup();
        await ensureMolstarResourcesLoaded();
        const viewer = await createMolstarViewer(containerRef.current);
        if (isCancelled) return;
        viewerRef.current = viewer;

        // Query AlphaFold API for actual file URL to avoid guessing versions
        apiControllerRef.current?.abort();
        const controller = new AbortController();
        apiControllerRef.current = controller;
        const apiUrl = `https://alphafold.ebi.ac.uk/api/prediction/${formattedId}`;
        const apiResp = await fetch(apiUrl, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (isCancelled) return;
        if (!apiResp.ok) {
          throw new Error("AlphaFold structure not available");
        }
        const predictions: Array<any> = await apiResp.json();
        if (!Array.isArray(predictions) || predictions.length === 0) {
          throw new Error("AlphaFold structure not available");
        }

        // Prefer PDB, then CIF, then Binary CIF (BCIF)
        const candidate = predictions[0];
        const pdbUrl: string | undefined = candidate?.pdbUrl || candidate?.uncompressedPdbUrl;
        const cifUrl: string | undefined = candidate?.cifUrl;
        const bcifUrl: string | undefined = candidate?.bcifUrl;

        const sources: Array<{ url: string; format: "pdb" | undefined }> = [];
        if (pdbUrl) sources.push({ url: pdbUrl, format: "pdb" });
        if (cifUrl) sources.push({ url: cifUrl, format: undefined });
        if (bcifUrl) sources.push({ url: bcifUrl, format: undefined });

        if (sources.length === 0) {
          throw new Error("AlphaFold structure not available");
        }

        let loaded = false;
        for (const { url, format } of sources) {
          try {
            await viewer.loadStructureFromUrl(url, format);
            loaded = true;
            break;
          } catch {
            if (isCancelled) return;
            // try next source
          }
        }
        if (!loaded) throw new Error("AlphaFold structure not available");

        if (isCancelled) return;
        setState({ isLoading: false, error: null });
        lastLoadedIdRef.current = formattedId;
      } catch (e) {
        // On any failure, present a clear error and avoid caching as loaded
        if (!isCancelled) {
          cleanup();
          setState({ isLoading: false, error: `AlphaFold structure is not available for ${formattedId}.` });
        }
      }
    }

    run();
    return () => {
      isCancelled = true;
      cleanup();
    };
  }, [proteinId, cleanup]);

  return { ...state, containerRef };
}



