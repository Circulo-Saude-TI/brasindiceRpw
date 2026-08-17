# Endpoint `GET /api/v1/brasindice/prestadores`

Necessário para a tela "Importação Brasíndice x Prestador" (equivalente ao programa GPS
`gp/dep/ImportaBrasPrestador.p`, procedure `seleciona-prestadores`).

## Requisição

```
GET /api/v1/brasindice/prestadores
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

## Alterações no `POST /api/v1/brasindice/importar`

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

Opcional: `"simular": true` roda a leitura/validação e devolve as contagens de criados/alterados
sem gravar nada em `preinpr`/`insupres` (equivalente ao "Simular?" da tela GPS). Ainda não há
campo correspondente no formulário Angular — se for útil, dá para adicionar um toggle "Testar
(simular)" no front reaproveitando esse parâmetro.

## Implementação de referência

A lógica headless (leitura do arquivo + gravação em `preinpr`/`insupres`, restrita aos
prestadores e tabelas informados) já foi implementada em
`especificos/gp/api/api-brasindice-prestador.p`, branch `GLPI-#12248`. Falta publicá-la
como recurso REST no catálogo PASOE nesses dois caminhos.
