import type { StructureData } from '@protspace/utils';

export interface StructureLoadDetail {
  proteinId: string;
  status: 'loading' | 'loaded' | 'error';
  error?: string;
  data?: StructureData | null;
}

export interface StructureLoadEvent extends CustomEvent {
  detail: StructureLoadDetail;
}
