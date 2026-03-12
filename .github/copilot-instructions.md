## Brasindice RPW - Projeto Angular

Sistema de importação de insumos Brasíndice via RPW com tema Círculo Saúde.

### Stack Principal
- Angular 17 (Standalone Components)
- PO-UI 17 (Web Components)
- Circulo Saude Theme 1.0.9
- TypeScript 5.4 + SCSS
- Reactive Forms + RxJS

### Estrutura de Pastas
```
src/app/
├── core/
│   ├── models/brasindice.models.ts (Interfaces)
│   └── services/brasindice-api.service.ts (API HTTP)
├── app.component.* (Formulário principal)
├── app.config.ts (Config Angular)
└── app.routes.ts (Rotas - empty)
```

### Funcionalidades Implementadas
✅ Upload de arquivo (base64)
✅ Seleção de layout, tipo de insumo, tabela de preço
✅ Parâmetros avançados (digitação manual, validade, valor zerado)
✅ Datas limite para alterações/inclusões
✅ Iniciar importação e rastrear status
✅ Notificações (sucesso/erro)
✅ Formulário reativo com validações
✅ Tema Círculo Saúde (azul + laranja)

### Endpoints API
Esperados em `/api/v1/brasindice/`:
- POST /import (iniciar)
- GET /import/{jobId} (status)
- GET /layouts (lista)
- GET /tipos-insumo (lista)
- GET /tabelas-preco (lista)

### Comandos Úteis
```bash
npm start              # Dev server (port 4200)
npm run build          # Build otimizado
npm test               # Testes unitários
npm run lint           # Linting
```

### Configurações Importantes
- Prerender: desabilitado (compatibilidade SSR)
- Budget: 3MB (PO-UI é pesado)
- CUSTOM_ELEMENTS_SCHEMA: ativado (web components)
- API Base: `/api/v1/brasindice` (ajustável em service)

### Próximos Passos
1. Conectar API real
2. Implementar polling para status
3. Adicionar testes e2e
4. Setup CI/CD (GitHub Actions)
5. Deploy em produção

Para mais detalhes, ver README.md

