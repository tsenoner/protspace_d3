/**
 * Service for handling protein structure loading from various sources
 */
export class StructureService {
  private static readonly ALPHAFOLD_BASE_URL =
    "https://alphafold.ebi.ac.uk/files";
  private static readonly ALPHAFOLD_MODEL_VERSIONS = ["v4", "v3", "v2", "v1"] as const;
  private static buildAlphaFoldUrl(proteinId: string, version: string) {
    return `${StructureService.ALPHAFOLD_BASE_URL}/AF-${proteinId}-F1-model_${version}.pdb`;
  }

  /**
   * Load protein structure from available sources
   * @param proteinId - The protein identifier
   * @returns Promise with structure data and metadata
   */
  public static async loadStructure(proteinId: string): Promise<StructureData> {
    const formattedId = this.formatProteinId(proteinId);

    // Try AlphaFold with version fallback
    try {
      const structureData = await this.tryLoadFromAlphaFoldWithFallback(formattedId);
      return structureData;
    } catch (alphafoldError) {
      console.warn(`AlphaFold loading failed for ${formattedId}:`, alphafoldError);
      throw new Error(`AlphaFold structure not available for ${formattedId}`);
    }
  }

  /**
   * Check if structure is available from AlphaFold
   * @param proteinId - The protein identifier
   * @returns Promise<boolean> indicating availability
   */
  public static async isAlphaFoldAvailable(
    proteinId: string
  ): Promise<boolean> {
    const formattedId = this.formatProteinId(proteinId);
    // Probe the latest known version first
    const alphafoldUrl = this.buildAlphaFoldUrl(formattedId, this.ALPHAFOLD_MODEL_VERSIONS[0]);

    try {
      const response = await fetch(alphafoldUrl, { method: "HEAD" });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Load structure from AlphaFold
   * @private
   */
  private static async loadFromAlphaFold(url: string, proteinId: string, version: string): Promise<StructureData> {
    const response = await fetch(url, { method: "HEAD" });
    if (!response.ok) {
      throw new Error(`AlphaFold structure not available for ${proteinId} (${version})`);
    }

    return {
      proteinId,
      source: "alphafold",
      url,
      format: "pdb",
      metadata: {
        confidence: "high",
        method: "predicted",
        version,
      },
    };
  }

  private static async tryLoadFromAlphaFoldWithFallback(proteinId: string): Promise<StructureData> {
    const errors: unknown[] = [];
    for (const version of this.ALPHAFOLD_MODEL_VERSIONS) {
      try {
        const url = this.buildAlphaFoldUrl(proteinId, version);
        return await this.loadFromAlphaFold(url, proteinId, version);
      } catch (e) {
        console.warn("[StructureService] AlphaFold version failed", { proteinId, version, error: e });
        errors.push(e);
        continue;
      }
    }
    throw errors[errors.length - 1] ?? new Error(`AlphaFold structure not available for ${proteinId}`);
  }

  /**
   * Format protein ID by removing version numbers
   * @private
   */
  private static formatProteinId(proteinId: string): string {
    return proteinId.split(".")[0];
  }
}

/**
 * Structure data interface
 */
export interface StructureData {
  proteinId: string;
  source: "alphafold";
  url: string | null;
  format: "pdb" | "cif";
  metadata: {
    confidence: "high" | "medium" | "low" | "experimental";
    method: "predicted" | "experimental";
    version: string;
  };
}

/**
 * Structure loading events
 */
export interface StructureLoadingEvent {
  proteinId: string;
  status: "loading" | "loaded" | "error";
  error?: string;
  data?: StructureData;
}
