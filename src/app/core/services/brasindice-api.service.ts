import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import {
  ImportRequest,
  ImportResponse,
  ImportStatus,
  Layout,
  MetadataResponse,
  TabelaPreco,
  TipoInsumo
} from '../models/brasindice.models';

@Injectable({ providedIn: 'root' })
export class BrasindiceApiService {
  private readonly baseUrl = '/api/v1/brasindice';

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

  startImport(payload: ImportRequest): Observable<ImportResponse> {
    const body = {
      arquivo: payload.arquivo,
      tipoInsumo: payload.tipoInsumo,
      tabelaPreco: payload.tabelaPreco,
      digitacaoManual: payload.digitacaoManual,
      alterarValidade: payload.alterarValidade,
      alterarValorZerado: payload.alterarValorZerado,
      dataLimiteAlt: payload.dataLimiteAlt,
      dataLimiteInc: payload.dataLimiteInc,
      importarCodigos: payload.importarCodigos,
      layout: payload.layout,
      servidorRpw: payload.servidorRpw
    };

    return this.http
      .post<ImportResponse & { nrPedido?: number; pedido?: number; mensagem?: string }>(
        `${this.baseUrl}/importar`,
        body
      )
      .pipe(
        map((response) => ({
          ...response,
          success: response.success ?? true,
          pedido: response.pedido ?? response.nrPedido ?? response.jobId,
          message: response.message ?? response.mensagem
        }))
      );
  }

  getImportStatus(pedido: number): Observable<ImportStatus> {
    return this.http
      .get<
        ImportStatus & {
          nrPedido?: number;
          pedido?: number;
          situacao?: string;
          mensagem?: string;
        }
      >(`${this.baseUrl}/status?pedido=${pedido}`)
      .pipe(
        map((response) => ({
          pedido: response.pedido ?? response.nrPedido ?? pedido,
          status: response.status ?? response.situacao ?? 'pending',
          message: response.message ?? response.mensagem
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

    throw new Error(`Resposta inválida para ${key}.`);
  }
}
