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

  // Limites para os campos de data (evita erros de digitação tipo "30/12/8000"
  // chegarem até o servidor).
  readonly dataMinima = new Date(new Date().getFullYear() - 2, 0, 1);
  readonly dataMaxima = new Date(new Date().getFullYear() + 5, 11, 31);

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

  private readonly limitePrestadoresSemConfirmacao = 30;
  aguardandoConfirmacaoQuantidade = false;

  private pollingTimerId?: number;

  readonly codigoOptions: PoSelectOption[] = [
    { value: 'Brasindice', label: 'Brasíndice' },
    { value: 'Tuss', label: 'TUSS' }
  ];

  tipoInsumoOptions: PoSelectOption[] = [];
  tabelaPrecoOptions: PoSelectOption[] = [];
  servidorRpwOptions: PoSelectOption[] = [];
  prestadorOptions: PoSelectOption[] = [];

  private updateTipoInsumoOptions(): void {
    this.tipoInsumoOptions = this.tiposInsumo.map((item) => ({
      value: item.codigo,
      label: `${item.codigo} - ${item.descricao}`
    }));
  }

  private updateTabelaPrecoOptions(): void {
    this.tabelaPrecoOptions = this.tabelasPreco.map((item) => ({
      value: item.codigo,
      label: `${item.codigo} - ${item.descricao}`
    }));
  }

  private updateServidorRpwOptions(): void {
    this.servidorRpwOptions = this.servidores.map((item) => ({
      value: item.codigo,
      label: item.descricao ? `${item.codigo} - ${item.descricao}` : item.codigo
    }));
  }

  private updatePrestadorOptions(): void {
    this.prestadorOptions = this.prestadores.map((item) => ({
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

    // Se o usuário mexer na seleção depois de um aviso de "muitos prestadores",
    // a confirmação anterior não vale mais - força reavaliar no próximo envio.
    this.form.controls.prestadores.valueChanges.subscribe(() => {
      this.aguardandoConfirmacaoQuantidade = false;
    });
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
    const camposFaltando = this.listarCamposObrigatoriosFaltando();
    if (camposFaltando.length) {
      this.notification.warning(`Preencha os campos obrigatórios: ${camposFaltando.join(', ')}.`);
      this.form.markAllAsTouched();
      return;
    }

    const qtdPrestadores = this.form.value.prestadores?.length || 0;
    if (
      qtdPrestadores > this.limitePrestadoresSemConfirmacao &&
      !this.aguardandoConfirmacaoQuantidade
    ) {
      this.aguardandoConfirmacaoQuantidade = true;
      this.notification.warning(
        `Você selecionou ${qtdPrestadores} prestadores — bem mais que o normal para esta importação ` +
        `(o processo padrão costuma usar uma lista curta e específica). Confira a seleção; se estiver ` +
        'correta, clique em "Iniciar importação" novamente para confirmar.'
      );
      return;
    }
    this.aguardandoConfirmacaoQuantidade = false;

    this.validationErrors = [];

    let payload: ImportRequest;
    try {
      payload = {
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
    } catch (error) {
      // Evita o spinner travado para sempre se algo synchronous quebrar
      // (ex.: NG0701 por locale nao registrado) antes da chamada HTTP.
      this.notification.error('Erro ao preparar os dados da importação. Verifique os campos de data.');
      return;
    }

    this.isSubmitting = true;

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
        this.updateServidorRpwOptions();
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
        this.updateTipoInsumoOptions();
        this.updateTabelaPrecoOptions();
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
        this.updatePrestadorOptions();

        // NÃO pré-selecionar nenhum prestador por padrão. O manual de operação
        // mostra que o fluxo real é o oposto do que se poderia supor: a tela
        // parte de tudo desmarcado (F5) e o usuário seleciona manualmente
        // apenas uma lista curta e específica de prestadores (~20 códigos),
        // não "todos menos alguns". Pré-marcar todos aqui criaria risco real
        // de precificar prestadores que não deveriam ser afetados nesta
        // importação.
        if (!prestadores.length) {
          this.notification.warning(
            'A API não retornou nenhum prestador com fator de faturamento vigente (depresfat). Verifique se há prestadores cadastrados para o período atual, ou selecione manualmente após configurar o servidor.'
          );
        }
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 404 || error.status === 405) {
          this.notification.warning(
            'A API não expõe /prestadores (endpoint não encontrado). Confirme se rest/api/v1/brasindice.p foi publicado no servidor RPW.'
          );
          return;
        }

        this.notification.warning(
          `Não foi possível carregar a lista de prestadores (erro ${error.status || 'desconhecido'}). Tente recarregar a página; se persistir, verifique sua sessão no TOTVS.`
        );
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

    this.updateTipoInsumoOptions();
    this.updateTabelaPrecoOptions();

    if (!this.form.value.tipoInsumo) {
      this.form.patchValue({ tipoInsumo: this.tiposInsumo[0].codigo });
    }
  }

  private listarCamposObrigatoriosFaltando(): string[] {
    const faltando: string[] = [];

    if (!this.form.value.arquivo) faltando.push('Arquivo');
    if (!this.form.value.tipoInsumo) faltando.push('Tipo de Insumo');
    if (!this.form.value.tabelasPreco?.length) faltando.push('Tabela Qtd Moeda');
    if (!this.form.value.servidorRpw) faltando.push('Servidor RPW');
    if (!this.form.value.prestadores?.length) faltando.push('Prestadores');

    return faltando;
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

    if (error.status === 0) {
      this.notification.error(
        'Não foi possível conectar ao servidor RPW. Verifique sua conexão ou se o serviço está no ar.'
      );
      return;
    }

    if (error.status === 401 || error.status === 302) {
      this.notification.error(
        'Sua sessão no TOTVS expirou ou não está autenticada. Faça login novamente no portal e tente aqui de novo.'
      );
      return;
    }

    if (error.status === 400) {
      this.notification.error(
        'O servidor recusou a requisição (dados inválidos). Confira arquivo, prestadores e tabelas selecionados.'
      );
      return;
    }

    if (error.status >= 500) {
      this.notification.error(
        `Erro interno no servidor RPW (${error.status}). Tente novamente em instantes; se persistir, acione o suporte.`
      );
      return;
    }

    this.notification.error(
      `Erro ao iniciar importação (${error.status || 'desconhecido'}). Verifique os dados e tente novamente.`
    );
  }

  private extractRowErrors(error: HttpErrorResponse): string[] {
    const payload = error.error as { RowErrors?: RowError[]; rowErrors?: RowError[] } | undefined;
    const rows = payload?.RowErrors || payload?.rowErrors || [];
    return rows
      .map((item) => item.ErrorMessage || item.ErrorDescription || '')
      .filter((message) => !!message);
  }
}
