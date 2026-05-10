# Bestiario Ordem Paranormal (Dev)

Add-on para Foundry VTT v14 com compêndios para o sistema `ordemparanormal`.

Dependência obrigatória do sistema:
- https://github.com/SouOWendel/ordemparanormal_fvtt

## Branches

- `main`: publicação estável
- `dev`: integração de contribuições

Abra PRs para `dev`.

## Estrutura do add-on

- `module.json`
- `packs/ameacas` (Actor)
- `packs/macros` (Macro)
- `packs/tabelas` (RollTable)
- `assets/tokens-normalized`
- `tools/` (scripts/macros de desenvolvimento)

## Pré-requisitos para contribuir

- Foundry VTT v14 instalado
- Sistema `ordemparanormal` instalado no Foundry
- PowerShell (Windows)
- Node.js

## Fluxo de desenvolvimento

1. Trabalhe na branch `dev`.
2. Edite dados/fontes e scripts em `tools/` quando necessário.
3. Copie módulo para Foundry:

```powershell
powershell -ExecutionPolicy Bypass -File ".\tools\prepare-module-copy.ps1"
```

4. Abra Foundry, ative o módulo e atualize os compêndios (ameaças/macros/tabelas).
5. Feche Foundry.
6. Sincronize os packs de volta para o repositório:

```powershell
powershell -ExecutionPolicy Bypass -File ".\tools\sync-packs-from-foundry.ps1"
```

## Scripts úteis (`tools/`)

- `build-ameacas.js`: gera `foundry-actors.json`
- `validate-creatures.js`: valida criaturas normalizadas
- `validate-foundry-actors.js`: valida saída final para Foundry
- `create-rolltables.macro.js`: cria/atualiza tabela "Roleta Maluca do Anfitrião"
- `trocar-forma-criatura.macro.js`: macro genérica de troca de forma por `tokenVariants`
- `prepare-release.ps1`: monta release local
- `validate-release.ps1`: valida estrutura da release

## Regra para compêndios

- Não editar arquivos LevelDB de `packs/*` manualmente.
- Sempre alterar compêndio dentro do Foundry e depois sincronizar com `sync-packs-from-foundry.ps1`.

## Checklist antes de PR

1. `module.json` válido e com packs corretos (`ameacas`, `macros`, `tabelas`).
2. Compêndios sincronizados a partir do Foundry (se houve mudanças neles).
3. README/CONTRIBUTING atualizados, se necessário.
4. Sem arquivos temporários ou lixo no commit.

## Fluxo de release (maintainers)

```powershell
powershell -ExecutionPolicy Bypass -File ".\tools\prepare-release.ps1"
powershell -ExecutionPolicy Bypass -File ".\tools\validate-release.ps1"
```

## Recursos de jogo incluídos

### Macro: Trocar Forma da Criatura

- Compêndio: `Macros - Bestiario Ordem Paranormal`
- Funciona para qualquer Actor com `flags["ordem-bestiario"].tokenVariants`
- Altera apenas o token selecionado na cena

### Tabela: Roleta Maluca do Anfitrião

- Compêndio: `Tabelas - Bestiario Ordem Paranormal`
- Use no início do turno do Anfitrião (Ato 2)
- Role 1 vez por ser em alcance longo
- Efeitos iguais são cumulativos
