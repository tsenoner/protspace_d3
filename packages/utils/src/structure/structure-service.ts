/**
 * Service for handling protein structure loading from various sources
 */
export class StructureService {
  private static readonly ALPHAFOLD_BASE_URL =
    "https://alphafold.ebi.ac.uk/files";
  private static readonly ALPHAFOLD_URL_PATTERN = (proteinId: string) =>
    `${StructureService.ALPHAFOLD_BASE_URL}/AF-${proteinId}-F1-model_v4.pdb`;

  /**
   * Load protein structure from available sources
   * @param proteinId - The protein identifier
   * @returns Promise with structure data and metadata
   */
  public static async loadStructure(proteinId: string): Promise<StructureData> {
    const formattedId = this.formatProteinId(proteinId);

    // Try AlphaFold first
    try {
      const alphafoldUrl = this.ALPHAFOLD_URL_PATTERN(formattedId);
      const structureData = await this.loadFromAlphaFold(
        alphafoldUrl,
        formattedId
      );
      return structureData;
    } catch (alphafoldError) {
      console.warn(
        `AlphaFold loading failed for ${formattedId}:`,
        alphafoldError
      );

      // Fallback to PDB
      try {
        const structureData = await this.loadFromPDB(formattedId);
        return structureData;
      } catch (pdbError) {
        throw new Error(
          `Failed to load structure from both AlphaFold and PDB: ${pdbError}`
        );
      }
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
    const alphafoldUrl = this.ALPHAFOLD_URL_PATTERN(formattedId);

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
  private static async loadFromAlphaFold(
    url: string,
    proteinId: string
  ): Promise<StructureData> {
    const response = await fetch(url, { method: "HEAD" });
    if (!response.ok) {
      throw new Error(`AlphaFold structure not available for ${proteinId}`);
    }

    return {
      proteinId,
      source: "alphafold",
      url,
      format: "pdb",
      metadata: {
        confidence: "high", // AlphaFold typically has confidence scores
        method: "predicted",
        version: "v4",
      },
    };
  }

  /**
   * Load structure from PDB
   * @private
   */
  private static async loadFromPDB(proteinId: string): Promise<StructureData> {
    // For PDB, we don't need to fetch - Molstar handles PDB loading internally
    return {
      proteinId,
      source: "pdb",
      url: null, // PDB loading uses protein ID, not URL
      format: "pdb",
      metadata: {
        confidence: "experimental",
        method: "experimental",
        version: "latest",
      },
    };
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
  source: "alphafold" | "pdb";
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
