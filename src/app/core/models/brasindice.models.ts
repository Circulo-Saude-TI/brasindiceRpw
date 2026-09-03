export interface Layout {
  id: number;
  nome: string;
  descricao?: string;
  programa?: string;
  campos?: string;
}

// Layout de negócio enviado no POST /importar. Sem ele o backend rotula tudo
// como "BRASINDICE" no .LST/.ERR/tabela/log. É 1 pedido por arquivo/layout.
export type LayoutBrasindice = 'SOLUCAO' | 'RESTRITO' | 'FABRICA' | 'PRECO-MAXIMO';

// Resultado de negócio da importação (GET /status -> campo "situacao"), distinto
// do "status" (estado da fila RPW: aguardando/executando/finalizado).
export type SituacaoImportacao =
  | 'AGUARDANDO'
  | 'EXECUTANDO'
  | 'OK'
  | 'OK_COM_ERROS'
  | 'SIMULADO'
  | 'SIMULADO_COM_ERROS'
  | 'ERRO';

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

export interface UploadRequest {
  nomeArquivo: string;
  conteudoBase64: string;
  servidorRpw: string;
}

export interface UploadResponse {
  success?: boolean;
  arquivo?: string;
  error?: string;
  message?: string;
}

export interface ImportRequest {
  arquivo: string;
  tipoInsumo: string;
  tabelasPreco: string[];
  digitacaoManual?: boolean;
  alterarValidade?: boolean;
  alterarValorZerado?: boolean;
  dataLimiteAlt?: string;
  dataLimiteInc?: string;
  importarCodigos?: string;
  // Layout de negócio (SOLUCAO/RESTRITO/FABRICA/PRECO-MAXIMO). Opcional no
  // backend, mas recomendado — sem ele tudo fica rotulado "BRASINDICE".
  layout?: LayoutBrasindice;
  // Número da revista (ex.: "1093"). Compõe o caminho dos arquivos e o log.
  edicao?: string;
  // Pasta onde o servidor RPW grava os .LST/.ERR. Precisa ser válida e gravável
  // do lado do RPW (T:\..., V:\..., \\servidor\share\...). Se omitida, o backend
  // cai em \\srvfs\informativo\BRASINDICE\SEM-EDICAO\.
  dirSaida?: string;
  // Expõe o "Simular?" do manual — quando true, não grava alterações.
  simular?: boolean;
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
  // Identificador da execução de negócio; guardar junto do pedido.
  idExec?: number | string;
  layout?: string;
  edicao?: string;
  // Caminhos calculados pelo backend (mesma lógica do alvo RPW), já disponíveis
  // na resposta do POST /importar — antes do primeiro GET /status.
  pastaSaida?: string;
  arquivoLst?: string;
  arquivoErr?: string;
  error?: string;
  message?: string;
  RowErrors?: RowError[];
}

export interface ImportStatus {
  pedido: number;
  // Estado da fila RPW: aguardando/executando/finalizado.
  status: string;
  message?: string;
  // Campos abaixo só chegam quando o alvo já rodou.
  // Resultado de negócio (AGUARDANDO/EXECUTANDO/OK/OK_COM_ERROS/SIMULADO/...).
  situacao?: string;
  criados?: number;
  alterados?: number;
  erros?: number;
  retorno?: string;
  arquivoLst?: string;
  arquivoErr?: string;
  arquivoJson?: string;
  inicio?: string;
  fim?: string;
  simulado?: boolean;
}

export interface MetadataResponse {
  layouts: Layout[];
  tipos: TipoInsumo[];
  tabelas: TabelaPreco[];
}
