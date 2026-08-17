export interface Layout {
  id: number;
  nome: string;
  descricao?: string;
  programa?: string;
  campos?: string;
}

export interface TipoInsumo {
  codigo: string;
  descricao: string;
}

export interface TabelaPreco {
  codigo: string;
  descricao: string;
}

export interface ServidorRpw {
  codigo: string;
  descricao: string;
}

export interface Prestador {
  codigoUnidade: string;
  codigo: string;
  nome: string;
}

export interface ImportRequest {
  arquivo: string;
  tipoInsumo: string;
  tabelaPreco?: string;
  digitacaoManual?: boolean;
  alterarValidade?: boolean;
  alterarValorZerado?: boolean;
  dataLimiteAlt?: string;
  dataLimiteInc?: string;
  importarCodigos?: string;
  layout?: number;
  servidorRpw: string;
  prestadores?: string[];
}

export interface RowError {
  ErrorSequence?: number;
  ErrorNumber?: number;
  ErrorType?: string;
  RowNumber?: number;
  ErrorMessage?: string;
  ErrorDescription?: string;
}

export interface ImportResponse {
  success?: boolean;
  pedido?: number;
  jobId?: number;
  error?: string;
  message?: string;
  RowErrors?: RowError[];
}

export interface ImportStatus {
  pedido: number;
  status: string;
  message?: string;
}

export interface MetadataResponse {
  layouts: Layout[];
  tipos: TipoInsumo[];
  tabelas: TabelaPreco[];
}
