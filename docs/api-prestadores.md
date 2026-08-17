# Endpoint `GET /api/rest/v1/brasindice/prestadores`

Necessário para a tela "Importação Brasíndice x Prestador" (equivalente ao programa GPS
`gp/dep/ImportaBrasPrestador.p`, procedure `seleciona-prestadores`).

## Requisição

```
GET /api/rest/v1/brasindice/prestadores
```

## Resposta esperada

```json
{
  "prestadores": [
    { "codigoUnidade": "1", "codigo": "000123", "nome": "HOSPITAL EXEMPLO" }
  ]
}
```

Também são aceitos: array puro `[...]`, ou chaves alternativas `Prestadores` / `items`.

Fonte de dados equivalente no `.p` original (`cria-tmp-prestador`):

```
for each depresfat no-lock:
    find first preserv where preserv.cd-unidade   = depresfat.cd-unidade
                         and preserv.cd-prestador = depresfat.cd-prestador no-lock no-error.
    -> codigoUnidade = preserv.cd-unidade
       codigo        = preserv.cd-prestador
       nome           = preserv.nm-prestador
```

## Alterações no `POST /api/rest/v1/brasindice/importar`

O body passa a incluir:

```json
{
  "prestadores": ["1|000123", "1|000456"],
  "tabelasPreco": ["CBH/09", "TUS/09", "CBH/14"]
}
```

- `prestadores`: cada item é `codigoUnidade|codigo`. O backend filtra `depresfat`/`preserv`
  pelos pares informados antes de rodar a leitura do arquivo e `cria-dados`, replicando o
  filtro que a tela GPS faz via `tmp-prestador`.
- `tabelasPreco`: **lista**, não string única — conforme o manual "Chamado para telas do
  Brasíndice" (passo *Tabela Qtd Moeda*, F5), a tela original permite marcar várias tabelas
  (ex.: CBH/09, TUS/09, CBH/14) e aplica o mesmo arquivo a todas elas, replicando o
  `for each tmp-tabelas where lg-sel = yes` do `.p` original. Um único código também é aceito
  (lista de 1 item).

Se `prestadores` ou `tabelasPreco` vier vazio, o pedido deve ser rejeitado (a tela já bloqueia
o envio nesses casos).

## Implementação de referência

A API foi implementada em `especificos/rest/api/v1/brasindice.p`, branch `GLPI-#12248`,
seguindo o padrão real deste projeto para publicar REST (`utp/ut-api-action.i`, o mesmo usado
por `rest/api/v1/paramConexaoTasy.p` e `rest/api/v1/integraNotasEntrada.p`). Rotas cobertas:
`GET /layouts`, `GET /tipos-insumo`, `GET /tabelas-preco`, `GET /prestadores`,
`POST /importar`, `GET /status`.

**Servidor RPW:** não precisou de rota própria em `brasindice.p`. A lista vem direto do
Business Entity nativo do TOTVS `GET /api/btb/v1/servidoresExecucao` (o mesmo usado pela tela
"Relatório de Pedidos" / `html.rpw-orderMaintenanceReport`), consumido em
`BrasindiceApiService.getServidoresRpw()`. Resposta paginada `{total, hasNext, items:
[{code, name}]}`, mapeada para `{codigo, descricao}`.

**Uma pendência conhecida, deixada de propósito sem implementação especulativa:**

- `POST /importar` roda a leitura e gravação de forma **síncrona**, dentro da própria chamada
  REST — não enfileira um pedido assíncrono via `rtp/rtcriapedidoexec.p` como faz
  `criaPedidoRpw` em `integraNotasEntrada.p` (o padrão usado no resto do sistema para rodar
  programas em servidor RPW). Funciona para o volume de um arquivo Brasíndice, mas diverge da
  arquitetura usada nas outras integrações — vale avaliar com o time se deve migrar para o
  modelo de fila.
