# Brasindice RPW - Importação de Insumos

Aplicação Angular para gestão de importação de insumos Brasíndice via RPW com tema Círculo Saúde (PO-UI).

## 🎨 Features

- ✅ Interface moderna com tema Círculo Saúde (azul + laranja)
- ✅ Importação de arquivo CSV/TXT em base64
- ✅ Seleção de layout, tipo de insumo e tabela de preço
- ✅ Configurações avançadas (digitação manual, validade, valor zerado)
- ✅ Rastreamento de pedido RPW em tempo real
- ✅ Formulário reativo com validação
- ✅ Notificações de sucesso/erro
- ✅ Integração com API REST

## 🛠️ Tech Stack

- **Angular 17** - Framework SPA
- **Reactive Forms** - Formulários reativos
- **PO-UI 17** - Componentes empresariais
- **Circulo Saude Theme** - Tema customizado
- **SCSS** - Pré-processador CSS
- **TypeScript** - Tipagem estática
- **RxJS** - Programação reativa

## 📋 Requisitos

- Node.js 18+
- npm 9+
- Angular CLI 17

## 🚀 Instalação e Execução

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento (porta 4200)
npm start

# Build para produção
npm run build

# Executar testes
npm test
```

## 🌐 Endpoints API Esperados

A aplicação espera uma API REST disponível em `/api/v1/brasindice/` com os seguintes endpoints:

### POST /api/rest/v1/brasindice/importar
Inicia uma importação Brasíndice via RPW. É **1 pedido por arquivo/layout**
(o front chama uma vez por arquivo).

**Request Body:**
```json
{
  "arquivo": "caminho/no/servidor/retornado/pelo/upload",
  "tipoInsumo": "01",
  "tabelasPreco": ["CBH/09", "CBH/14", "TUS/09"],
  "prestadores": ["unid|prest"],
  "layout": "SOLUCAO",
  "edicao": "1093",
  "dirSaida": "B:\\NUCLEO_PARAMETRIZACAO_E_REGULACAO\\BRASINDICE\\1093",
  "simular": false,
  "digitacaoManual": false,
  "alterarValidade": false,
  "alterarValorZerado": false,
  "dataLimiteAlt": "31/12/2026",
  "dataLimiteInc": "31/12/2026",
  "importarCodigos": "Brasindice",
  "servidorRpw": "rpw-homolog"
}
```

Campos novos (todos opcionais — o backend lê com `if oPayload:Has(...)`):

| Campo | Valores | Observação |
|-------|---------|------------|
| `layout` | `SOLUCAO` \| `RESTRITO` \| `FABRICA` \| `PRECO-MAXIMO` | Sem ele tudo fica rotulado `BRASINDICE` no .LST/.ERR/tabela/log |
| `edicao` | nº da revista (ex.: `"1093"`) | Compõe o caminho dos arquivos e o `es-bras-log` |
| `dirSaida` | pasta de rede visível ao servidor RPW | Recomendado sempre enviar; senão usa fallback placeholder |
| `simular` | `true` / `false` | Expõe o "Simular?" do manual |

**Response:**
```json
{
  "success": true,
  "pedido": 12345,
  "idExec": 987,
  "layout": "SOLUCAO",
  "edicao": "1093",
  "message": "Pedido RPW criado com sucesso."
}
```

### GET /api/rest/v1/brasindice/status?pedido=N
Consulta o status de uma importação.

- `status` = estado da fila RPW (`aguardando` / `executando` / `finalizado`)
- `situacao` = resultado de negócio (`AGUARDANDO` / `EXECUTANDO` / `OK` / `OK_COM_ERROS` / `SIMULADO` / `SIMULADO_COM_ERROS` / `ERRO`)

O polling do front para quando `situacao` é `OK` / `OK_COM_ERROS` / `SIMULADO*` / `ERRO`.

**Response (após o alvo rodar):**
```json
{
  "pedido": 12345,
  "status": "finalizado",
  "situacao": "OK_COM_ERROS",
  "criados": 120,
  "alterados": 45,
  "erros": 3,
  "retorno": "Processado com 3 rejeições",
  "arquivoLst": "B:\\...\\1093\\SOLUCAO.LST",
  "arquivoErr": "B:\\...\\1093\\SOLUCAO.ERR",
  "arquivoJson": "B:\\...\\1093\\SOLUCAO.JSON",
  "inicio": "02/09/2026 14:30:00",
  "fim": "02/09/2026 14:32:10",
  "simulado": false
}
```

### GET /api/v1/brasindice/layouts
Retorna lista de layouts disponíveis

### GET /api/v1/brasindice/tipos-insumo
Retorna tipos de insumo disponíveis

### GET /api/v1/brasindice/tabelas-preco
Retorna tabelas de preço disponíveis

## 📂 Estrutura do Projeto

```
src/
├── app/
│   ├── core/
│   │   ├── models/
│   │   │   └── brasindice.models.ts       # Interfaces de dados
│   │   └── services/
│   │       └── brasindice-api.service.ts  # Serviço HTTP
│   ├── app.component.ts                   # Componente principal
│   ├── app.component.html                 # Template
│   ├── app.component.scss                 # Estilos
│   ├── app.config.ts                      # Configuração Angular
│   └── app.routes.ts                      # Rotas
├── styles.scss                             # Estilos globais + tema
├── main.ts                                 # Entry point
└── index.html                              # HTML base
```

## 🎨 Tema Círculo Saúde

O tema está automaticamente integrado:
- **Cores**: Azul primário (#2e4aa6) + Laranja destaque (#f59e0b)
- **Arquivo**: `node_modules/circulosaudetheme/dist/index.css`
- **Customização**: Editar variáveis CSS em `src/styles.scss`

## 🔧 Configuração

### Alterar URL base da API

Editar em `src/app/core/services/brasindice-api.service.ts`:

```typescript
private readonly baseUrl = '/api/v1/brasindice'; // Alterar aqui
```

## 📦 Build e Deploy

```bash
# Build otimizado (dist/brasindice-rpw/)
npm run build

# Testar build localmente
npm install -g http-server
cd dist/brasindice-rpw/browser
http-server
```

## 🔄 Development

```bash
# Iniciar servidor com reload automático
npm start

# Acessar em http://localhost:4200
```

## ✅ Build Status

✔️ Compilação sem erros
✔️ Tema Círculo Saúde integrado
✔️ Formulário reativo funcional
✔️ API service configurado
✔️ Responsive layout pronto

## 📝 Notas Importantes

- A API REST deve estar em CORS compatible
- Arquivo é enviado como base64 no payload
- Formulário valida campos obrigatórios
- Usa CUSTOM_ELEMENTS_SCHEMA para web components PO-UI
- Prerender desabilitado para SSR compatibility

## 👥 Desenvolvido para

Círculo Saúde 🏥

- **SCSS**: Styling preprocessor

## Project Structure

```
brasindice-rpw/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── models/
│   │   │   │   └── brasindice.models.ts      # API interfaces
│   │   │   └── services/
│   │   │       └── brasindice-api.service.ts # HTTP client
│   │   ├── app.component.ts                  # Main form component
│   │   ├── app.component.html                # PO-UI template
│   │   ├── app.component.scss                # Styles
│   │   ├── app.config.ts                     # Angular config
│   │   └── app.routes.ts                     # Routing (empty)
│   ├── styles.scss                           # Global styles
│   ├── main.ts                               # Bootstrap
│   └── index.html                            # HTML template
├── angular.json                              # CLI config (includes theme CSS)
├── package.json                              # Dependencies
└── README.md                                 # This file
```

## API Endpoints

The app communicates with these endpoints:

```
POST   /api/v1/brasindice/import              # Start import job
GET    /api/v1/brasindice/import/{jobId}      # Check job status
GET    /api/v1/brasindice/layouts             # List available layouts
GET    /api/v1/brasindice/tipos-insumo        # List item types
GET    /api/v1/brasindice/tabelas-preco       # List pricing tables
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Dependencies already included:
   - `@po-ui/ng-components@17`
   - `@po-ui/ng-templates@17`
   - `@po-ui/style@17`
   - `circulosaudetheme@1.0.9`

### Development Server

Run the development server:

```bash
npm start
```

Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

### Build

Build the project for production:

```bash
npm run build
```

Output will be in `dist/brasindice-rpw/`.

### Testing

Run unit tests:

```bash
npm test
```

## Usage

1. **Select Layout**: Choose from available layouts (Brasíndice, Custom, SIMPRO)
2. **Choose Type & Table**: Select item type and pricing table
3. **Upload File**: Select your TXT/CSV file
4. **Configure Options**:
   - Manual entry mode
   - Validity date alterations
   - Zero-value handling
   - Code import preference (Brasíndice, TUSS, or both)
5. **Set RPW Server**: Specify the RPW server (e.g., `rpw-homolog`)
6. **Submit**: Click "Iniciar importação" to create the job
7. **Track**: Use "Consultar status" to poll the job status

## Form Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| arquivo | File | ✓ | Upload TXT/CSV file |
| layout | Select | ✓ | Layout de negócio: SOLUCAO / RESTRITO / FABRICA / PRECO-MAXIMO |
| edicao | Input | | Número da revista (ex.: 1093) |
| dirSaida | Input | | Pasta de rede visível ao servidor RPW p/ .LST/.ERR/.JSON |
| tipoInsumo | Select | ✓ | Item type (medicament, daily, etc.) |
| tabelasPreco | MultiSelect | ✓ | Uma ou mais tabelas (ex.: CBH/09, TUS/09) |
| prestadores | MultiSelect | ✓ | Lista `unid\|prest`; só os marcados têm preço atualizado |
| simular | Switch | | Simular sem gravar alterações |
| importarCodigos | Select | | Code format (Brasíndice/TUSS) |
| digitacaoManual | Switch | | Allow manual entry |
| alterarValidade | Switch | | Modify validity dates |
| alterarValorZerado | Switch | | Accept zero prices |
| dataLimiteAlt | DatePicker | | Cutoff for alterations |
| dataLimiteInc | DatePicker | | Cutoff for inclusions |
| servidorRpw | Input | ✓ | RPW server name |

## Styling & Theme

The app uses the **Circulo Saúde theme** via `circulosaudetheme` package.

### Colors (CSS Variables)

```scss
--color-brand-01-base: #2e4aa6      // Primary blue
--color-brand-03-base: #f59e0b      // Accent orange
--color-neutral-*: var(--po-*)      // Neutral grays
```

Modify in `src/styles.scss` or override via CSS custom properties.

### Layout

- **Containers**: Grouped by function (file, params, execution, reference)
- **Grid**: Responsive layout for field groups
- **Spacing**: Consistent margins via PO-UI spacing system

## Backend Integration

Update the API base URL in `src/app/core/services/brasindice-api.service.ts`:

```typescript
private readonly baseUrl = '/api/v1/brasindice';  // Change to your API URL
```

## Error Handling

- **Validation errors**: Form-level validation before submission
- **Network errors**: HTTP error responses show notifications
- **API errors**: Response errors displayed via `PoNotificationService`

## Future Enhancements

- [ ] File preview/validation before upload
- [ ] Job history and archive view
- [ ] Batch import scheduling
- [ ] Import result reporting with error details
- [ ] Internationalization (i18n)
- [ ] Dark mode support
- [ ] E2E testing with Cypress

## Troubleshooting

**Theme not applying?**
- Ensure `circulosaudetheme` CSS is in `angular.json` styles array
- Restart dev server after package changes

**API endpoints not found?**
- Check backend service is running
- Verify base URL in `brasindice-api.service.ts`
- Check CORS headers if running on different origins

**File upload fails?**
- Ensure file is .txt or .csv
- Check backend file size limits
- Verify base64 encoding in browser console

## Support & Documentation

- [Angular Docs](https://angular.dev)
- [PO-UI Docs](https://po-ui.io)
- [Circulo Saúde Theme](https://npmjs.com/package/circulosaudetheme)
