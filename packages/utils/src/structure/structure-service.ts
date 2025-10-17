/**
 * AlphaFold API response interface
 */
interface AlphaFoldPrediction {
  entryId: string;
  gene: string;
  uniprotAccession: string;
  uniprotId: string;
  uniprotDescription: string;
  taxId: number;
  organismScientificName: string;
  uniprotSequence: string;
  bcifUrl?: string;
  cifUrl?: string;
  pdbUrl?: string;
  modelVersion: string;
}

/**
 * Service for handling protein structure loading from various sources
 */
export class StructureService {
  private static readonly ALPHAFOLD_API_URL = 'https://www.alphafold.ebi.ac.uk/api/prediction';

  /**
   * Load protein structure from available sources
   * @param proteinId - The protein identifier
   * @returns Promise with structure data and metadata
   */
  public static async loadStructure(proteinId: string): Promise<StructureData> {
    const formattedId = this.formatProteinId(proteinId);

    // Fetch prediction data from AlphaFold API
    const apiUrl = `${this.ALPHAFOLD_API_URL}/${formattedId}`;

    try {
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`AlphaFold API request failed: ${response.status}`);
      }

      const predictions: AlphaFoldPrediction[] = await response.json();

      if (!predictions || predictions.length === 0) {
        throw new Error(`No AlphaFold prediction found for ${formattedId}`);
      }

      const prediction = predictions[0];

      // Determine the best available format (prefer PDB for compatibility)
      let structureUrl = '';
      let format: 'pdb' | 'cif' | 'mmcif' = 'pdb';
      let binary = false;

      // Use PDB format first as it's most compatible with Molstar
      if (prediction.pdbUrl) {
        structureUrl = prediction.pdbUrl;
        format = 'pdb';
        binary = false;
      } else if (prediction.cifUrl) {
        structureUrl = prediction.cifUrl;
        format = 'mmcif';
        binary = false;
      } else if (prediction.bcifUrl) {
        structureUrl = prediction.bcifUrl;
        format = 'cif';
        binary = true;
      } else {
        throw new Error(`No structure URL found for ${formattedId}`);
      }

      // Fetch the structure file data and create a blob URL
      // This avoids CORS issues and works better with Molstar
      const structureResponse = await fetch(structureUrl);
      if (!structureResponse.ok) {
        throw new Error(`Failed to fetch structure file: ${structureResponse.status}`);
      }

      const structureData = binary
        ? await structureResponse.arrayBuffer()
        : await structureResponse.text();

      // Create blob and blob URL
      const blob = new Blob([structureData], {
        type: binary ? 'application/octet-stream' : 'text/plain',
      });
      const blobUrl = URL.createObjectURL(blob);

      return {
        proteinId: formattedId,
        source: 'alphafold',
        url: blobUrl,
        format,
        metadata: {
          confidence: 'high',
          method: 'predicted',
          version: prediction.modelVersion || 'unknown',
        },
      };
    } catch (error) {
      console.error(
        `[StructureService] Failed to load AlphaFold structure for ${formattedId}:`,
        error
      );
      throw new Error(`AlphaFold structure not available for ${formattedId}`);
    }
  }

  /**
   * Check if structure is available from AlphaFold
   * @param proteinId - The protein identifier
   * @returns Promise<boolean> indicating availability
   */
  public static async isAlphaFoldAvailable(proteinId: string): Promise<boolean> {
    const formattedId = this.formatProteinId(proteinId);
    const apiUrl = `${this.ALPHAFOLD_API_URL}/${formattedId}`;

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) return false;

      const predictions: AlphaFoldPrediction[] = await response.json();
      return predictions && predictions.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Format protein ID by removing version numbers
   * @private
   */
  private static formatProteinId(proteinId: string): string {
    return proteinId.split('.')[0];
  }
}

/**
 * Structure data interface
 */
export interface StructureData {
  proteinId: string;
  source: 'alphafold';
  url: string | null;
  format: 'pdb' | 'cif' | 'mmcif'; // 'cif' = binary CIF, 'mmcif' = regular CIF, 'pdb' = PDB
  metadata: {
    confidence: 'high' | 'medium' | 'low' | 'experimental';
    method: 'predicted' | 'experimental';
    version: string;
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
