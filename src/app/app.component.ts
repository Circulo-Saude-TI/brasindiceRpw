import { CommonModule, formatDate } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
    PoModule,
    PoNotificationService,
    PoSelectOption
} from '@po-ui/ng-components';
import { ImportRequest, ImportStatus, Layout, Prestador, RowError, ServidorRpw, TabelaPreco, TipoInsumo } from './core/models/brasindice.models';
import { BrasindiceApiService } from './core/services/brasindice-api.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PoModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  readonly defaultLayout = 1;

  readonly form = this.fb.group({
    arquivo: ['', Validators.required],
    tipoInsumo: ['', Validators.required],
    tabelasPreco: [[] as string[], Validators.required],
    digitacaoManual: [false],
    alterarValidade: [false],
    alterarValorZerado: [false],
    dataLimiteAlt: [null as Date | null],
    dataLimiteInc: [null as Date | null],
    importarCodigos: ['Brasindice'],
    servidorRpw: ['', Validators.required],
    prestadores: [[] as string[], Validators.required]
  });

  layouts: Layout[] = [];
  tiposInsumo: TipoInsumo[] = [];
  tabelasPreco: TabelaPreco[] = [];
  servidores: ServidorRpw[] = [];
  prestadores: Prestador[] = [];
  isLoadingPrestadores = false;
  status: ImportStatus | null = null;
  lastPedido?: number;
  validationErrors: string[] = [];

  isLoadingOptions = false;
  isLoadingServidores = false;
  isSubmitting = false;
  isCheckingStatus = false;

  fileName = '';

  private pollingTimerId?: number;

  readonly codigoOptions: PoSelectOption[] = [
    { value: 'Brasindice', label: 'Brasíndice' },
    { value: 'Tuss', label: 'TUSS' }
  ];

  get tipoInsumoOptions(): PoSelectOption[] {
    return this.tiposInsumo.map((item) => ({ value: item.codigo, label: `${item.codigo} - ${item.descricao}` }));
  }

  get tabelaPrecoOptions(): PoSelectOption[] {
    return this.tabelasPreco.map((item) => ({ value: item.codigo, label: `${item.codigo} - ${item.descricao}` }));
  }

  get servidorRpwOptions(): PoSelectOption[] {
    return this.servidores.map((item) => ({ value: item.codigo, label: item.descricao ? `${item.codigo} - ${item.descricao}` : item.codigo }));
  }

  get prestadorOptions(): PoSelectOption[] {
    return this.prestadores.map((item) => ({
      value: `${item.codigoUnidade}|${item.codigo}`,
      label: `${item.codigo} - ${item.nome}`
    }));
  }

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: BrasindiceApiService,
    private readonly notification: PoNotificationService
  ) {}

  ngOnInit(): void {
    this.loadOptions();
    this.loadPrestadores();
  }

  ngOnDestroy(): void {
    this.stopStatusPolling();
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (!file) {
      this.fileName = '';
      return;
    }

    this.fileName = file.name;
    // Pré-preenche com o caminho padrão no servidor; usuário pode editar antes de enviar
    const currentPath = this.form.value.arquivo;
    if (!currentPath) {
      this.form.patchValue({ arquivo: `t:/brasindice/${file.name}` });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.notification.warning('Informe o arquivo e os campos obrigatórios.');
      this.form.markAllAsTouched();
      return;
    }

    if (!this.form.value.prestadores?.length) {
      this.notification.warning('Selecione ao menos um prestador.');
      return;
    }

    if (!this.form.value.tabelasPreco?.length) {
      this.notification.warning('Selecione ao menos uma tabela de preço (Qtd Moeda).');
      return;
    }

    this.validationErrors = [];
    this.isSubmitting = true;

    const payload: ImportRequest = {
      arquivo: this.form.value.arquivo!,
      tipoInsumo: this.form.value.tipoInsumo!,
      tabelasPreco: this.form.value.tabelasPreco || [],
      digitacaoManual: !!this.form.value.digitacaoManual,
      alterarValidade: !!this.form.value.alterarValidade,
      alterarValorZerado: !!this.form.value.alterarValorZerado,
      dataLimiteAlt: this.serializeDate(this.form.value.dataLimiteAlt || null),
      dataLimiteInc: this.serializeDate(this.form.value.dataLimiteInc || null),
      importarCodigos: this.form.value.importarCodigos || undefined,
      layout: this.defaultLayout,
      servidorRpw: this.form.value.servidorRpw!,
      prestadores: this.form.value.prestadores || []
    };

    this.api.startImport(payload).subscribe({
      next: (response) => {
        const pedido = response.pedido ?? response.jobId;
        if (response.success !== false && pedido) {
          this.lastPedido = pedido;
          this.status = null;
          this.notification.success(response.message || `Pedido RPW criado com sucesso: ${pedido}.`);
          this.refreshStatus(true);
          this.startStatusPolling();
        } else {
          this.notification.error(response.error || 'Não foi possível iniciar a importação.');
        }
      },
      error: (error: HttpErrorResponse) => {
        this.handleSubmitError(error);
      },
      complete: () => {
        this.isSubmitting = false;
      }
    });
  }

  refreshStatus(silent = false): void {
    if (!this.lastPedido) {
      return;
    }

    this.isCheckingStatus = true;
    this.api.getImportStatus(this.lastPedido).subscribe({
      next: (status) => {
        this.status = status;
        if (this.isFinalStatus(status.status)) {
          this.stopStatusPolling();
        }
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 404) {
          this.stopStatusPolling();
          if (!silent) {
            this.notification.warning('Pedido não encontrado.');
          }
          return;
        }

        if (!silent) {
          this.notification.error('Erro ao consultar status do pedido.');
        }
      },
      complete: () => {
        this.isCheckingStatus = false;
      }
    });
  }

  private loadOptions(): void {
    this.isLoadingOptions = true;
    this.isLoadingServidores = true;

    this.api.getServidoresRpw().subscribe({
      next: (servidores) => {
        this.servidores = servidores;
        if (servidores.length && !this.form.value.servidorRpw) {
          this.form.patchValue({ servidorRpw: servidores[0].codigo });
        }
      },
      complete: () => {
        this.isLoadingServidores = false;
      }
    });

    this.api.loadMetadata().subscribe({
      next: ({ layouts, tipos, tabelas }) => {
        this.layouts = layouts;
        this.tiposInsumo = tipos;
        this.tabelasPreco = tabelas;
        if (!this.form.value.tipoInsumo && this.tiposInsumo.length) {
          this.form.patchValue({ tipoInsumo: this.tiposInsumo[0].codigo });
        }
      },
      error: (error: HttpErrorResponse) => {
        this.applyFallbackMetadata();

        if (error.status === 404 || error.status === 405) {
          this.notification.warning(
            'A API não expõe /layouts, /tipos-insumo e /tabelas-preco. Usando opções padrão locais.'
          );
          return;
        }

        this.notification.warning('Não foi possível carregar listas da API. Usando opções padrão locais.');
      },
      complete: () => {
        this.isLoadingOptions = false;
      }
    });
  }

  private loadPrestadores(): void {
    this.isLoadingPrestadores = true;
    this.api.getPrestadores().subscribe({
      next: (prestadores) => {
        this.prestadores = prestadores;

        // Comportamento do RC0110D/E: a tela abre com todos os prestadores
        // pré-selecionados; o usuário desmarca os que não quer importar.
        if (prestadores.length && !this.form.value.prestadores?.length) {
          this.form.patchValue({
            prestadores: prestadores.map((item) => `${item.codigoUnidade}|${item.codigo}`)
          });
        }

        if (!prestadores.length) {
          this.notification.warning(
            'A API não retornou prestadores (endpoint /prestadores ainda não implementado no RPW?). Selecione manualmente após configurar o servidor.'
          );
        }
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 404 || error.status === 405) {
          this.notification.warning(
            'A API não expõe /prestadores. Peça ao time RPW para publicar o endpoint (ver docs/api-prestadores.md).'
          );
          return;
        }

        this.notification.warning('Não foi possível carregar a lista de prestadores.');
      },
      complete: () => {
        this.isLoadingPrestadores = false;
      }
    });
  }

  private applyFallbackMetadata(): void {
    this.layouts = [{ id: this.defaultLayout, nome: 'Brasíndice', descricao: 'Layout padrão Brasíndice' }];

    if (!this.tiposInsumo.length) {
      this.tiposInsumo = [
        { codigo: '01', descricao: 'Medicamento' },
        { codigo: '21', descricao: 'Medicamentos Brasíndice' }
      ];
    }

    if (!this.tabelasPreco.length) {
      this.tabelasPreco = [
        { codigo: '01', descricao: 'Tabela padrão' },
        { codigo: '20', descricao: 'TUSS - Proc. Méd.' }
      ];
    }

    if (!this.form.value.tipoInsumo) {
      this.form.patchValue({ tipoInsumo: this.tiposInsumo[0].codigo });
    }
  }

  private serializeDate(value: Date | string | null): string | undefined {
    if (!value) {
      return undefined;
    }

    const parsed = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return undefined;
    }

    return formatDate(parsed, 'dd/MM/yyyy', 'pt-BR');
  }

  private startStatusPolling(): void {
    this.stopStatusPolling();
    this.pollingTimerId = window.setInterval(() => this.refreshStatus(true), 5000);
  }

  private stopStatusPolling(): void {
    if (!this.pollingTimerId) {
      return;
    }

    window.clearInterval(this.pollingTimerId);
    this.pollingTimerId = undefined;
  }

  private isFinalStatus(status?: string): boolean {
    const normalized = (status || '').toLowerCase();
    return ['done', 'completed', 'success', 'error', 'failed'].includes(normalized);
  }

  private handleSubmitError(error: HttpErrorResponse): void {
    const rowErrors = this.extractRowErrors(error);
    this.validationErrors = rowErrors;

    if (rowErrors.length) {
      rowErrors.forEach((message) => this.notification.warning(message));
      return;
    }

    this.notification.error('Erro ao iniciar importação. Verifique os dados e tente novamente.');
  }

  private extractRowErrors(error: HttpErrorResponse): string[] {
    const payload = error.error as { RowErrors?: RowError[]; rowErrors?: RowError[] } | undefined;
    const rows = payload?.RowErrors || payload?.rowErrors || [];
    return rows
      .map((item) => item.ErrorMessage || item.ErrorDescription || '')
      .filter((message) => !!message);
  }
}
