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

  getServidoresRpw(): Observable<ServidorRpw[]> {
    return this.http
      .get<
        | { servidores?: ServidorRpw[]; Servidores?: ServidorRpw[]; items?: ServidorRpw[] }
        | ServidorRpw[]
      >(`${this.baseUrl}/servidores-rpw`)
      .pipe(
        map((response) => {
          if (Array.isArray(response)) {
            return response as ServidorRpw[];
          }

          if (response && typeof response === 'object') {
            const collection =
              response.servidores ??
              response.Servidores ??
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

  startImport(payload: ImportRequest): Observable<ImportResponse> {
    const body: Record<string, unknown> = {
      arquivo: payload.arquivo,
      tipoInsumo: payload.tipoInsumo,
      tabelaPreco: payload.tabelaPreco,
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
