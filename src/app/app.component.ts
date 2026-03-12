import { CommonModule, formatDate } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
    PoModule,
    PoNotificationService,
    PoSelectOption
} from '@po-ui/ng-components';
import { ImportRequest, ImportStatus, Layout, RowError, TabelaPreco, TipoInsumo } from './core/models/brasindice.models';
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
  readonly form = this.fb.group({
    arquivo: [null as File | null, Validators.required],
    tipoInsumo: ['', Validators.required],
    tabelaPreco: [''],
    digitacaoManual: [false],
    alterarValidade: [false],
    alterarValorZerado: [false],
    dataLimiteAlt: [null as Date | null],
    dataLimiteInc: [null as Date | null],
    importarCodigos: ['Brasindice'],
    layout: [1, Validators.required],
    servidorRpw: ['', Validators.required]
  });

  layouts: Layout[] = [];
  tiposInsumo: TipoInsumo[] = [];
  tabelasPreco: TabelaPreco[] = [];
  status: ImportStatus | null = null;
  lastPedido?: number;
  validationErrors: string[] = [];

  isLoadingOptions = false;
  isSubmitting = false;
  isCheckingStatus = false;

  fileName = '';
  filePayload = '';

  private pollingTimerId?: number;

  readonly codigoOptions: PoSelectOption[] = [
    { value: 'Brasindice', label: 'Brasíndice' },
    { value: 'Tuss', label: 'TUSS' }
  ];

  get layoutOptions(): PoSelectOption[] {
    return this.layouts.map((item) => ({ value: item.id, label: `${item.id} - ${item.nome}` }));
  }

  get tipoInsumoOptions(): PoSelectOption[] {
    return this.tiposInsumo.map((item) => ({ value: item.codigo, label: `${item.codigo} - ${item.descricao}` }));
  }

  get tabelaPrecoOptions(): PoSelectOption[] {
    return this.tabelasPreco.map((item) => ({ value: item.codigo, label: `${item.codigo} - ${item.descricao}` }));
  }

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: BrasindiceApiService,
    private readonly notification: PoNotificationService
  ) {}

  ngOnInit(): void {
    this.loadOptions();
  }

  ngOnDestroy(): void {
    this.stopStatusPolling();
  }

  async onFileSelected(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (!file) {
      this.form.patchValue({ arquivo: null });
      this.fileName = '';
      this.filePayload = '';
      return;
    }

    this.form.patchValue({ arquivo: file });
    this.fileName = file.name;
    this.filePayload = await this.readFileAsBase64(file);
  }

  onSubmit(): void {
    if (this.form.invalid || !this.filePayload) {
      this.notification.warning('Informe o arquivo e os campos obrigatórios.');
      this.form.markAllAsTouched();
      return;
    }

    this.validationErrors = [];
    this.isSubmitting = true;

    const payload: ImportRequest = {
      arquivo: this.filePayload,
      tipoInsumo: this.form.value.tipoInsumo!,
      tabelaPreco: this.form.value.tabelaPreco || undefined,
      digitacaoManual: !!this.form.value.digitacaoManual,
      alterarValidade: !!this.form.value.alterarValidade,
      alterarValorZerado: !!this.form.value.alterarValorZerado,
      dataLimiteAlt: this.serializeDate(this.form.value.dataLimiteAlt || null),
      dataLimiteInc: this.serializeDate(this.form.value.dataLimiteInc || null),
      importarCodigos: this.form.value.importarCodigos || undefined,
      layout: this.form.value.layout!,
      servidorRpw: this.form.value.servidorRpw!
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
    this.api.loadMetadata().subscribe({
      next: ({ layouts, tipos, tabelas }) => {
        this.layouts = layouts;
        this.tiposInsumo = tipos;
        this.tabelasPreco = tabelas;
        if (!this.form.value.layout && this.layouts.length) {
          this.form.patchValue({ layout: this.layouts[0].id });
        }
        if (!this.form.value.tipoInsumo && this.tiposInsumo.length) {
          this.form.patchValue({ tipoInsumo: this.tiposInsumo[0].codigo });
        }
        if (!this.form.value.tabelaPreco && this.tabelasPreco.length) {
          this.form.patchValue({ tabelaPreco: this.tabelasPreco[0].codigo });
        }
      },
      error: () => {
        this.notification.error('Erro ao carregar layouts, tipos e tabelas. Verifique autenticação/acesso da API.');
      },
      complete: () => {
        this.isLoadingOptions = false;
      }
    });
  }

  private serializeDate(value: Date | string | null): string | undefined {
    if (!value) {
      return undefined;
    }

    const parsed = value instanceof Date ? value : new Date(value);
    return formatDate(parsed, 'dd/MM/yyyy', 'pt-BR');
  }

  private readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
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
    return rows.map((item) => item.ErrorMessage).filter(Boolean);
  }
}
