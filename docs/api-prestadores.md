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
  "prestadores": ["1|000123", "1|000456"]
}
```

Cada item é `codigoUnidade|codigo`. O backend deve filtrar `depresfat`/`preserv` pelos
pares informados antes de rodar a leitura do arquivo e `cria-dados`, replicando o filtro
que hoje é feito pela tela GPS via `tmp-prestador`. Se a lista vier vazia, o pedido deve
ser rejeitado (a tela já bloqueia o envio nesse caso).
