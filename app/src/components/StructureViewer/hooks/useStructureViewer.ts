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

  const cleanup = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
    try {
      viewerRef.current?.dispose?.();
    } catch {}
    viewerRef.current = null;
    if (containerRef.current) containerRef.current.innerHTML = "";
  }, []);

  useEffect(() => {
    if (!proteinId || !containerRef.current) return;

    const formattedId = proteinId.split(".")[0];
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

        // Prefer AlphaFold PDB
        const alphafoldUrl = `https://alphafold.ebi.ac.uk/files/AF-${formattedId}-F1-model_v4.pdb`;
        const head = await fetch(alphafoldUrl, { method: "HEAD" });
        if (!head.ok) {
          setState({ isLoading: false, error: `AlphaFold structure is not available for ${formattedId}.` });
          lastLoadedIdRef.current = formattedId;
          return;
        }

        await viewer.loadStructureFromUrl(alphafoldUrl, "pdb");
        if (isCancelled) return;
        setState({ isLoading: false, error: null });
        lastLoadedIdRef.current = formattedId;
      } catch (e) {
        // Fallback to direct PDB load
        try {
          if (!viewerRef.current && containerRef.current) {
            await ensureMolstarResourcesLoaded();
            viewerRef.current = await createMolstarViewer(containerRef.current);
          }
          await viewerRef.current.loadPdb(formattedId);
          if (!isCancelled) {
            setState({ isLoading: false, error: null });
            lastLoadedIdRef.current = formattedId;
          }
        } catch (err) {
          if (!isCancelled) {
            setState({ isLoading: false, error: "Failed to load protein structure" });
          }
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



