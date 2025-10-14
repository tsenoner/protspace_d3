/**
 * Service for handling protein structure loading from 3D-Beacons hub API
 * Docs: https://www.ebi.ac.uk/pdbe/pdbe-kb/3dbeacons/docs#infra
 * API:  https://www.ebi.ac.uk/pdbe/pdbe-kb/3dbeacons/api/
 */
export class StructureService {
  private static readonly BEACONS_BASE_URL = 'https://www.ebi.ac.uk/pdbe/pdbe-kb/3dbeacons/api';

  /**
   * Load best-available protein structure via 3D-Beacons (by UniProt accession)
   * Preference order: experimental (lowest resolution), then predicted
   * Preferred format: mmCIF/cif over PDB
   */
  public static async loadStructure(proteinId: string): Promise<StructureData> {
    const accession = this.formatProteinId(proteinId);
    const entries = await this.fetchBeaconsStructures(accession);

    if (!entries || entries.length === 0) {
      throw new Error(`3D-Beacons structure not available for ${accession}`);
    }

    const best = this.selectBestBeaconsEntry(entries);
    if (!best || !best.coordinateUrl) {
      throw new Error(`3D-Beacons structure not available for ${accession}`);
    }

    const format = this.determineFormat(best.coordinateUrl, best.formatRaw);
    if (!format) {
      throw new Error(`3D-Beacons coordinate format not recognized for ${accession}`);
    }

    return {
      proteinId: accession,
      source: '3dbeacons',
      url: best.coordinateUrl,
      format,
      metadata: {
        provider: best.provider,
        category: best.isExperimental ? 'experimental' : 'predicted',
        resolution: best.resolution,
        modelId: best.modelId,
      },
    };
  }

  private static async fetchBeaconsStructures(accession: string): Promise<unknown[]> {
    // 3D-Beacons Hub v2 endpoint: /uniprot/{accession}.json
    // e.g. https://www.ebi.ac.uk/pdbe/pdbe-kb/3dbeacons/api/uniprot/P05067.json
    const url = `${this.BEACONS_BASE_URL}/uniprot/${encodeURIComponent(accession)}.json`;
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) {
      throw new Error(`3D-Beacons request failed: ${response.status}`);
    }
    const json = await response.json();
    // Response format: { uniprot_entry: {...}, structures: [...] }
    if (json && Array.isArray((json as any).structures)) return (json as any).structures;
    return [];
  }

  private static selectBestBeaconsEntry(entries: unknown[]): {
    coordinateUrl: string | null;
    formatRaw: string | null;
    provider: string;
    isExperimental: boolean;
    resolution?: number;
    modelId?: string;
  } | null {
    type Normalized = {
      coordinateUrl: string | null;
      formatRaw: string | null;
      provider: string;
      isExperimental: boolean;
      resolution?: number;
      modelId?: string;
      formatPreferenceScore: number; // lower is better (0=cif, 1=pdb, 2=unknown)
    };

    const normalized: Normalized[] = (entries as any[]).map((e) => {
      // 3D-Beacons v2 response structure: entries have a 'summary' object
      const summary = e?.summary ?? e;

      const coordinateUrl: string | null =
        summary?.model_url ??
        summary?.coordinate_url ??
        summary?.coordinates_url ??
        summary?.url ??
        summary?.download_url ??
        null;

      const formatRaw: string | null =
        (summary?.model_format ?? summary?.format ?? null) &&
        String(summary?.model_format ?? summary?.format);
      const provider: string = String(
        summary?.provider ?? summary?.source ?? summary?.resource ?? '3D-Beacons'
      );
      const modelId: string | undefined =
        summary?.model_identifier ??
        summary?.model_id ??
        summary?.id ??
        summary?.identifier ??
        undefined;

      const categoryRaw: string = String(
        summary?.model_category ?? summary?.category ?? summary?.type ?? ''
      ).toLowerCase();
      const isExperimental: boolean =
        Boolean(summary?.experimental) ||
        categoryRaw.includes('experimental') ||
        (summary?.experimental_method !== null && summary?.experimental_method !== undefined);

      let resolution: number | undefined = undefined;
      const resCandidate = summary?.resolution ?? summary?.experimental_resolution;
      if (resCandidate !== undefined && resCandidate !== null) {
        const parsed = Number(resCandidate);
        if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
          resolution = parsed;
        }
      }

      const urlForFormat = coordinateUrl ?? '';
      const ext = urlForFormat.split('?')[0].toLowerCase();
      const formatPreferenceScore =
        ext.endsWith('.cif') || ext.endsWith('.mmcif') ? 0 : ext.endsWith('.pdb') ? 1 : 2;

      return {
        coordinateUrl,
        formatRaw,
        provider,
        isExperimental,
        resolution,
        modelId,
        formatPreferenceScore,
      } as Normalized;
    });

    const withUrl = normalized.filter((n) => n.coordinateUrl);
    if (withUrl.length === 0) return null;

    withUrl.sort((a, b) => {
      // Prefer experimental over predicted
      if (a.isExperimental !== b.isExperimental) return a.isExperimental ? -1 : 1;
      // Prefer better (lower) resolution when available
      if (a.resolution !== undefined || b.resolution !== undefined) {
        if (a.resolution === undefined) return 1;
        if (b.resolution === undefined) return -1;
        if (a.resolution !== b.resolution) return a.resolution - b.resolution;
      }
      // Prefer mmCIF/cif over PDB
      if (a.formatPreferenceScore !== b.formatPreferenceScore) {
        return a.formatPreferenceScore - b.formatPreferenceScore;
      }
      // Prefer well-known providers
      const providerRank = (p: string) => {
        const s = p.toLowerCase();
        if (s.includes('pdbe') || s.includes('pdb')) return 0;
        if (s.includes('alphafold')) return 1;
        if (s.includes('swiss')) return 2;
        return 3;
      };
      const prA = providerRank(a.provider);
      const prB = providerRank(b.provider);
      if (prA !== prB) return prA - prB;
      return 0;
    });

    return withUrl[0];
  }

  private static determineFormat(
    coordinateUrl: string,
    formatRaw: string | null
  ): 'pdb' | 'mmcif' | null {
    const url = coordinateUrl.split('?')[0].toLowerCase();
    if (url.endsWith('.cif') || url.endsWith('.mmcif')) return 'mmcif';
    if (url.endsWith('.pdb')) return 'pdb';
    if (formatRaw) {
      const f = formatRaw.toLowerCase();
      if (f.includes('cif')) return 'mmcif';
      if (f.includes('pdb')) return 'pdb';
    }
    return null;
  }

  /**
   * Normalize UniProt accession (remove optional version suffix)
   */
  private static formatProteinId(proteinId: string): string {
    return proteinId.split('.')[0];
  }
}

/**
 * Structure data interface (3D-Beacons)
 */
export interface StructureData {
  proteinId: string;
  source: '3dbeacons';
  url: string;
  format: 'pdb' | 'mmcif';
  metadata: {
    provider: string;
    category: 'predicted' | 'experimental';
    resolution?: number;
    modelId?: string;
  };
}

/**
 * Structure loading events
 */
export interface StructureLoadingEvent {
  proteinId: string;
  status: 'loading' | 'loaded' | 'error';
  error?: string;
  data?: StructureData;
}
