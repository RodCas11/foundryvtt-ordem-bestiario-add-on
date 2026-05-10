# ordem-bestiario

Modulo/add-on de compendio de ameacas para Foundry VTT v14 no sistema `ordemparanormal`.

## Importante

As macros `scripts/import-actors-to-compendium.macro.js` e `scripts/clear-and-import-actors-to-compendium.macro.js` sao ferramentas de desenvolvimento.

Elas servem apenas para popular o compendio local durante a criacao do modulo.

O usuario final nao precisa rodar macro, nao precisa colar JSON e nao precisa importar actors manualmente.

A versao final do modulo deve incluir `packs/ameacas` preenchido.

## Fluxo de desenvolvimento

1. Gerar actors:

```powershell
cd "D:\bestiario-ordem-paranormal\ordem-bestiario"

node .\scripts\merge-manual-creatures.js
node .\scripts\validate-creatures.js
node .\scripts\build-ameacas.js --only-exportable
```

2. Copiar modulo para o Foundry:

```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\prepare-module-copy.ps1"
```

3. Abrir Foundry, ativar o modulo e rodar macro de importacao para popular o compendio.

4. Depois que o compendio estiver populado, fechar o Foundry.

5. Copiar a pasta `packs/ameacas` preenchida de volta do `Data/modules` para o projeto:

```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\sync-pack-from-foundry.ps1"
```

## Fluxo de release

Depois que `packs/ameacas` estiver preenchido, gerar pacote final do modulo contendo:

- `module.json`
- `packs/ameacas`
- `assets/tokens`
- `README.md`

O usuario final so instala/ativa o modulo. Nao roda macro.

## Comandos finais

## Gerar dados

```powershell
cd "D:\bestiario-ordem-paranormal\ordem-bestiario"

node .\scripts\merge-manual-creatures.js
node .\scripts\validate-creatures.js
node .\scripts\build-ameacas.js --only-exportable
```

## Copiar modulo para Foundry para desenvolvimento

```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\prepare-module-copy.ps1"
```

Depois:

- abrir Foundry
- ativar modulo
- rodar `clear-and-import-actors-to-compendium.macro.js`
- confirmar que o compendio esta preenchido
- fechar Foundry

## Sincronizar pack populado de volta para o projeto

```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\sync-pack-from-foundry.ps1"
```

## Preparar release final

```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\prepare-release.ps1"
```

## Validar release

```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\validate-release.ps1"
```

## Anfitrião e tokens alternativos

- O Anfitrião é importado como um único Actor.
- As facetas ficam cadastradas em `flags["ordem-bestiario"].tokenVariants`.
- Para trocar a forma visual em cena, selecione o token de uma criatura com variantes e execute a macro `scripts/trocar-forma-criatura.macro.js`.
- A macro altera somente o token colocado na cena, não o Actor original do compendium.

## Macro: Trocar Forma da Criatura

O módulo inclui um compêndio de macros chamado:

- `Macros - Bestiario Ordem Paranormal`

Dentro dele existe a macro:

- `Trocar Forma da Criatura`

Como usar:

1. Ative o módulo no mundo.
2. Abra o compêndio `Macros - Bestiario Ordem Paranormal`.
3. Arraste a macro `Trocar Forma da Criatura` para a hotbar.
4. Arraste uma criatura com formas alternativas para a cena (ex.: Anfitrião, Degolificada).
5. Selecione exatamente 1 token dessa criatura.
6. Execute a macro.
7. Escolha a forma desejada (lista dinâmica baseada em `tokenVariants` da criatura).

A macro altera apenas o token selecionado na cena.
Ela não altera o Actor original do compêndio.

## Tabela: Roleta Maluca do Anfitrião

- O módulo inclui um compêndio de tabelas chamado `Tabelas - Bestiario Ordem Paranormal`.
- Dentro dele existe a tabela `Roleta Maluca do Anfitrião`.
- Use essa tabela no início do turno do Anfitrião durante o Ato 2.
- Role uma vez para cada ser em alcance longo.
- Os efeitos iguais são cumulativos.
