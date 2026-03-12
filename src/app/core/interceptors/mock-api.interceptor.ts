import {
    HttpEvent,
    HttpHandler,
    HttpInterceptor,
    HttpRequest,
    HttpResponse
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

@Injectable()
export class MockApiInterceptor implements HttpInterceptor {
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Mock para GET /layouts
    if (request.url.includes('/layouts') && request.method === 'GET') {
      return of(
        new HttpResponse({
          status: 200,
          body: {
            layouts: [
              {
                id: 1,
                nome: 'Layout Básico',
                descricao: 'Layout padrão para importação de insumos básicos',
                programa: 'SIAFEM',
                campos: 'codigo, descricao, valor, validade'
              },
              {
                id: 2,
                nome: 'Layout Premium',
                descricao: 'Layout avançado com campos adicionais',
                programa: 'SIAFEM Plus',
                campos: 'codigo, descricao, valor, validade, margem, categoria'
              },
              {
                id: 3,
                nome: 'Layout Simplificado',
                descricao: 'Layout com campos mínimos',
                programa: 'Sistema Básico',
                campos: 'codigo, descricao, valor'
              }
            ]
          }
        })
      ).pipe(delay(500));
    }

    // Mock para GET /tipos-insumo
    if (request.url.includes('/tipos-insumo') && request.method === 'GET') {
      return of(
        new HttpResponse({
          status: 200,
          body: {
            tipos: [
              { codigo: '001', descricao: 'Medicamento' },
              { codigo: '002', descricao: 'Material de Consumo' },
              { codigo: '003', descricao: 'Equipamento' },
              { codigo: '004', descricao: 'Serviço' },
              { codigo: '005', descricao: 'Insumo Laboratorial' }
            ]
          }
        })
      ).pipe(delay(500));
    }

    // Mock para GET /tabelas-preco
    if (request.url.includes('/tabelas-preco') && request.method === 'GET') {
      return of(
        new HttpResponse({
          status: 200,
          body: {
            tabelas: [
              { codigo: 'TP001', descricao: 'Tabela Principal 2024' },
              { codigo: 'TP002', descricao: 'Tabela Regional Norte' },
              { codigo: 'TP003', descricao: 'Tabela Regional Nordeste' },
              { codigo: 'TP004', descricao: 'Tabela Regional Centro-Oeste' },
              { codigo: 'TP005', descricao: 'Tabela Regional Sudeste' },
              { codigo: 'TP006', descricao: 'Tabela Regional Sul' }
            ]
          }
        })
      ).pipe(delay(500));
    }

    // Mock para POST /import
    if (request.url.includes('/import') && request.method === 'POST') {
      const jobId = Math.floor(Math.random() * 10000) + 1000;
      return of(
        new HttpResponse({
          status: 200,
          body: {
            success: true,
            jobId: jobId,
            message: `Importação iniciada com sucesso. Job ID: ${jobId}`
          }
        })
      ).pipe(delay(800));
    }

    // Mock para GET /import/{jobId}
    if (request.url.includes('/import/') && request.method === 'GET') {
      const statuses = ['processing', 'processing', 'completed', 'completed', 'error'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

      return of(
        new HttpResponse({
          status: 200,
          body: {
            jobId: parseInt(request.url.split('/').pop() || '0'),
            status: randomStatus,
            message: this.getStatusMessage(randomStatus)
          }
        })
      ).pipe(delay(400));
    }

    // Requisições reais passam normalmente
    return next.handle(request);
  }

  private getStatusMessage(status: string): string {
    const messages: { [key: string]: string } = {
      'processing': 'Importação em processamento...',
      'completed': 'Importação concluída com sucesso! 1.245 registros processados.',
      'error': 'Erro ao processar importação. Verifique o arquivo.',
      'queued': 'Importação aguardando processamento...',
      'success': 'Importação finalizada com êxito.'
    };
    return messages[status] || 'Status desconhecido';
  }
}
