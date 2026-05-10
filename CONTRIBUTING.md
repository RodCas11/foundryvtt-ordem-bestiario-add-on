# Contribuindo

Obrigado por contribuir com o **Bestiario Ordem Paranormal**.

## Fluxo de branch

- A branch principal de desenvolvimento é `dev`.
- A branch `main` é focada em versões estáveis/publicação.
- Faça seus PRs para `dev`.

## Como contribuir

1. Faça fork do repositório.
2. Crie uma branch a partir de `dev`.
3. Faça suas alterações.
4. Teste localmente no Foundry.
5. Abra PR para `dev` com descrição clara do que mudou.

## Pasta `tools`

A pasta `tools/` contém scripts e macros de desenvolvimento usados para:

- geração/validação de dados
- importação/sincronização de compêndios
- preparação/validação de release

Esses arquivos são utilitários de desenvolvimento e manutenção do módulo.

## Boas práticas

- Não commitar segredos/chaves.
- Evitar mudanças não relacionadas no mesmo PR.
- Manter compatibilidade com Foundry VTT v14 e sistema `ordemparanormal`.
- Se alterar compêndios (`packs/*`), explique no PR como foram gerados/sincronizados.
