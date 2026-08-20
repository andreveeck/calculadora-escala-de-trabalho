# Regras matemáticas das escalas

O app trata datas como `YYYY-MM-DD`, sem horário, e converte diferenças usando dias UTC. Isso evita depender do fuso do servidor. A data de "hoje" vem de `Intl.DateTimeFormat` com `America/Sao_Paulo`.

Para datas anteriores à referência, o resto do ciclo usa módulo matemático positivo:

```ts
((diferenca % tamanhoDoCiclo) + tamanhoDoCiclo) % tamanhoDoCiclo
```

## 6x1

- Referência: uma data conhecida de folga.
- Ciclo: 7 dias.
- Dia de folga: resto `0`.
- Dias de trabalho: restos `1` a `6`.

## 12x36

- Referência: data em que o trabalhador iniciou um plantão.
- Ciclo: 2 dias.
- Dia de plantão: resto `0`.
- Dia de folga: resto `1`.

Como a versão atual trabalha com datas sem horário, a escala mostra o dia de início do plantão como trabalho.

## 6x2

- Referência: primeiro dia de trabalho após duas folgas.
- Ciclo: 8 dias.
- Dias de trabalho: restos `0` a `5`.
- Dias de folga: restos `6` e `7`.

## 3x3

- Referência: primeiro dia de trabalho do ciclo.
- Ciclo: 6 dias.
- Dias de trabalho: restos `0` a `2`.
- Dias de folga: restos `3` a `5`.
