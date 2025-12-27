
export interface SheetRow {
  [key: string]: string | number;
}

export interface PlotPoint {
  lat: number;
  lng: number;
  data: SheetRow;
}

export interface ColumnMapping {
  latColumn: string;
  lngColumn: string;
}

export interface StyleRule {
  column: string;
  type: 'categorical';
  colorMap: Record<string, string>;
}

export interface StyleConfig {
  activeColumn: string | null;
  rule: StyleRule | null;
}

export type ThemeMode = 'light' | 'dark';

export interface AppState {
  isLoading: boolean;
  error: string | null;
  sheetData: SheetRow[];
  headers: string[];
  mapping: ColumnMapping | null;
  points: PlotPoint[];
  styleConfig: StyleConfig;
  theme: ThemeMode;
}
