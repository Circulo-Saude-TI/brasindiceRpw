import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';
import {
  ImportRequest,
  ImportResponse,
  ImportStatus,
  Layout,
  MetadataResponse,
  Prestador,
  ServidorRpw,
  TabelaPreco,
  TipoInsumo,
  UploadRequest,
  UploadResponse
} from '../models/brasindice.models';

@Injectable({ providedIn: 'root' })
export class BrasindiceApiService {
  // Prefixo confirmado em routes/RestAPI/*.http (especificos): /api/rest/v1/<recurso>,
  // nao /api/v1/<recurso>. Resource "brasindice" = rest/api/v1/brasindice.p.
  private readonly baseUrl = '/api/rest/v1/brasindice';

  constructor(private readonly http: HttpClient) {}

  loadMetadata(): Observable<MetadataResponse> {
    return forkJoin({
      layouts: this.getLayouts(),
      tipos: this.getTiposInsumo(),
      tabelas: this.getTabelasPreco()
    });
  }

  getLayouts(): Observable<Layout[]> {
    return this.http
      .get<{ layouts?: Layout[] } | Layout[]>(`${this.baseUrl}/layouts`)
      .pipe(map((response) => this.extractCollection<Layout>(response, 'layouts')));
  }

  getTiposInsumo(): Observable<TipoInsumo[]> {
    return this.http
      .get<{ tipos?: TipoInsumo[] } | TipoInsumo[]>(`${this.baseUrl}/tipos-insumo`)
      .pipe(map((response) => this.extractCollection<TipoInsumo>(response, 'tipos')));
  }

  getTabelasPreco(): Observable<TabelaPreco[]> {
    return this.http
      .get<{ tabelas?: TabelaPreco[] } | TabelaPreco[]>(`${this.baseUrl}/tabelas-preco`)
      .pipe(map((response) => this.extractCollection<TabelaPreco>(response, 'tabelas')));
  }

  // Endpoint nativo do TOTVS RPW (o mesmo usado pela tela "Relatório de Pedidos" /
  // html.rpw-orderMaintenanceReport para listar servidores de execução) - não faz
  // parte do rest/api/v1/brasindice.p, é um Business Entity padrão do produto.
  getServidoresRpw(): Observable<ServidorRpw[]> {
    return this.http
      .get<{ total?: number; hasNext?: boolean; items?: { code: string; name: string }[] }>(
        '/api/btb/v1/servidoresExecucao',
        { params: { page: 1, pageSize: 999, filter: '', fields: '', expand: '', order: '' } }
      )
      .pipe(
        map((response) =>
          (response.items ?? []).map((item) => ({ codigo: item.code, descricao: item.name }))
        ),
        catchError(() => of([]))
      );
  }

  getPrestadores(): Observable<Prestador[]> {
    return this.http
      .get<
        | { prestadores?: Prestador[]; Prestadores?: Prestador[]; items?: Prestador[] }
        | Prestador[]
      >(`${this.baseUrl}/prestadores`)
      .pipe(
        map((response) => {
          if (Array.isArray(response)) {
            return response as Prestador[];
          }

          if (response && typeof response === 'object') {
            const collection =
              response.prestadores ??
              response.Prestadores ??
              response.items;

            if (Array.isArray(collection)) {
              return collection;
            }
          }

          return [];
        }),
        catchError(() => of([]))
      );
  }

  // O AppServer/servidor RPW não enxerga unidades de rede mapeadas na sessão do
  // usuário (ex.: T:\), então o arquivo precisa ser enviado em base64 para o
  // servidor primeiro; o "arquivo" retornado (caminho já visível ao backend) é
  // o que deve ser usado no payload de /importar.
  uploadArquivo(payload: UploadRequest): Observable<UploadResponse> {
    return this.http.post<UploadResponse>(`${this.baseUrl}/upload`, payload);
  }

  startImport(payload: ImportRequest): Observable<ImportResponse> {
    const body: Record<string, unknown> = {
      arquivo: payload.arquivo,
      tipoInsumo: payload.tipoInsumo,
      tabelasPreco: payload.tabelasPreco,
      digitacaoManual: payload.digitacaoManual,
      alterarValidade: payload.alterarValidade,
      alterarValorZerado: payload.alterarValorZerado,
      dataLimiteAlt: payload.dataLimiteAlt,
      dataLimiteInc: payload.dataLimiteInc,
      importarCodigos: payload.importarCodigos,
      servidorRpw: payload.servidorRpw,
      prestadores: payload.prestadores ?? []
    };

    if (payload.layout !== undefined) {
      body['layout'] = payload.layout;
    }

    return this.http
      .post<
        ImportResponse & {
          nrPedido?: number;
          pedido?: number;
          Pedido?: number;
          mensagem?: string;
          Mensagem?: string;
        }
      >(
        `${this.baseUrl}/importar`,
        body
      )
      .pipe(
        map((response) => ({
          ...response,
          success: response.success ?? true,
          pedido: response.pedido ?? response.Pedido ?? response.nrPedido ?? response.jobId,
          message: response.message ?? response.mensagem ?? response.Mensagem
        }))
      );
  }

  getImportStatus(pedido: number): Observable<ImportStatus> {
    return this.http
      .get<
        ImportStatus & {
          nrPedido?: number;
          pedido?: number;
          Pedido?: number;
          situacao?: string;
          Situacao?: string;
          mensagem?: string;
          Mensagem?: string;
          retorno?: string;
          Retorno?: string;
        }
      >(`${this.baseUrl}/status?pedido=${pedido}`)
      .pipe(
        map((response) => ({
          pedido: response.pedido ?? response.Pedido ?? response.nrPedido ?? pedido,
          status: response.status ?? response.situacao ?? response.Situacao ?? 'pending',
          message:
            response.message ??
            response.mensagem ??
            response.Mensagem ??
            response.retorno ??
            response.Retorno
        }))
      );
  }

  private extractCollection<T>(response: unknown, key: 'layouts' | 'tipos' | 'tabelas'): T[] {
    if (Array.isArray(response)) {
      return response as T[];
    }

    if (response && typeof response === 'object' && key in response) {
      const value = (response as Record<string, unknown>)[key];
      if (Array.isArray(value)) {
        return value as T[];
      }
    }

    if (response && typeof response === 'object') {
      const record = response as Record<string, unknown>;
      const alternateKeys: Record<'layouts' | 'tipos' | 'tabelas', string[]> = {
        layouts: ['Layouts', 'items'],
        tipos: ['Tipos', 'items'],
        tabelas: ['Tabelas', 'items']
      };

      for (const alternateKey of alternateKeys[key]) {
        const value = record[alternateKey];
        if (Array.isArray(value)) {
          return value as T[];
        }
      }
    }

    throw new Error(`Resposta inválida para ${key}.`);
  }
}
