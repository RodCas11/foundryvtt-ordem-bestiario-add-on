# Bestiario Ordem Paranormal

Add-on para Foundry VTT (v14) com compêndio de ameaças para o sistema `ordemparanormal`.

## Conteúdo do módulo

Este add-on já inclui os compêndios prontos:

- `Ameacas - Ordem Paranormal` (`Actor`)
- `Macros - Bestiario Ordem Paranormal` (`Macro`)

Também inclui os tokens em:

- `assets/tokens-normalized`

## Requisitos

- Foundry VTT v14
- Sistema `ordemparanormal`

## Instalação

1. Copie a pasta do módulo para o diretório `Data/modules` do Foundry.
2. Inicie o Foundry.
3. Ative o módulo no seu mundo.

## Uso dos compêndios

1. Abra `Compendiums`.
2. Em `Ameacas - Ordem Paranormal`, arraste os atores desejados para a cena.
3. Em `Macros - Bestiario Ordem Paranormal`, use as macros disponíveis.

## Macro: Trocar Forma do Anfitrião

A macro `Trocar Forma do Anfitrião` está no compêndio:

- `Macros - Bestiario Ordem Paranormal`

### Como usar

1. Abra o compêndio `Macros - Bestiario Ordem Paranormal`.
2. Arraste `Trocar Forma do Anfitrião` para a hotbar.
3. Arraste o `Anfitrião` para a cena.
4. Selecione exatamente 1 token do Anfitrião.
5. Execute a macro.
6. Escolha a forma:
   - Base
   - Amphitruo
   - Aeneas
   - Liber
   - Plautus
   - Silenus

A macro altera apenas o token selecionado na cena.
Ela não altera o Actor original no compêndio.

## Suporte de formas do Anfitrião

O Anfitrião é importado como um único Actor.
As formas alternativas ficam em `flags["ordem-bestiario"].tokenVariants`.
