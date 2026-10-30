# Eleitorado × População · Bahia

Quantos eleitores há em cada município da Bahia em comparação com quantas pessoas moram lá, e qual é o
perfil desse eleitorado. Cruza o cadastro eleitoral do **TSE** com a estimativa de população do **IBGE**
para os 417 municípios do estado.

Acesse: **https://projetoagis.github.io/eleitorado-populacao-bahia/**

---

## O que o site mostra

### Tela inicial: eleitores × habitantes

Uma tabela com os 417 municípios:

| Coluna | O que é |
|---|---|
| Município / Cód. IBGE | Nome oficial do IBGE e código de 7 dígitos |
| Habitantes | População estimada pelo IBGE em 1º de julho de 2026 |
| Eleitores | Eleitores aptos no cadastro do TSE |
| Eleitores / Habitantes | Eleitores ÷ habitantes, em % |
| Habitantes − Eleitores | Diferença absoluta (negativa quando há mais eleitores que habitantes) |

- **Filtros:** nome ou código (aceita digitar sem acento ou apóstrofo), faixa da razão
  (acima de 100%, 90–100%, 80–90%, 70–80%, até 70%) e porte do município.
- Ordenação por qualquer coluna, linha de total do que está filtrado e **exportação em CSV**.
- Clicar no nome do município abre o perfil dele na Análise Detalhada.

### Análise Detalhada

Escolha um **recorte**: a Bahia inteira, uma faixa de porte (ex.: municípios de 10 a 20 mil habitantes)
ou um município. Os números do recorte aparecem sempre ao lado dos números da Bahia.

| Aba | Conteúdo |
|---|---|
| Faixa etária | Pirâmide etária (mulheres × homens), voto facultativo de 16–17 anos e de 70 anos ou mais, eleitores com 60 anos ou mais |
| Gênero e estado civil | Distribuição e diferença em pontos percentuais em relação à Bahia |
| Escolaridade | Grau de escolaridade declarado; analfabetos, "lê e escreve" e superior completo |
| Autodeclarações | Raça/cor, identidade de gênero, quilombola e intérprete de Libras, com a cobertura de quem informou |
| Comparar municípios | Os municípios lado a lado em 15 indicadores, ordenáveis e filtráveis por porte |
| Locais de votação | Os 9.324 locais de votação, com seções, eleitores, média por seção, biometria e eleitores com deficiência; filtro por zona |

Também mostra, para cada recorte: eleitores com biometria, eleitores com deficiência ou mobilidade reduzida,
zonas, seções e locais de votação. Toda tabela pode ser baixada em CSV.

---

## Fontes

| Fonte | Base | Referência |
|---|---|---|
| **TSE** | [Perfil do eleitorado por seção eleitoral 2026](https://dadosabertos.tse.jus.br/dataset/eleitorado-2026) | Cadastro de 14/07/2026 |
| **IBGE** | [Estimativas da população residente nos municípios](https://www.ibge.gov.br/estatisticas/sociais/populacao/9103-estimativas-de-populacao.html) | 1º de julho de 2026 (publicada no DOU) |

---

## Como os dados foram preparados

### Do arquivo do TSE para o site

O arquivo da Bahia publicado pelo TSE tem **1,6 GB e 6,4 milhões de linhas**. Cada linha é uma
combinação de perfil numa seção eleitoral (por exemplo: *seção 230, homem, solteiro, 21 a 24 anos,
ensino médio completo → 6 eleitores*). Textos repetidos em todas as linhas (nome do município, nome
da escola, descrições por extenso) explicam boa parte do tamanho.

O site não precisa de cada combinação, só dos **totais**. As linhas foram somadas:

- **por município** → cerca de 120 números por município (gênero, estado civil, faixa etária por gênero,
  escolaridade, autodeclarações, biometria, deficiência, nome social, zonas, seções e locais);
- **por local de votação** → seções, eleitores, biometria e deficiência de cada local.

O resultado são dois arquivos em `assets/data/`:

| Arquivo | Conteúdo | Tamanho |
|---|---|---|
| `eleitorado.json` | Os 417 municípios com população e perfil do eleitorado | ~260 KB |
| `locais.json` | Os 9.324 locais de votação | ~670 KB (só é baixado ao abrir a aba de locais) |

Os dois são **JSON** e não CSV porque o perfil de cada município tem várias distribuições dentro dele,
e o navegador lê JSON diretamente. Para quem quer planilha, o próprio site gera o CSV.

**O que fica de fora do resumo:** o detalhe por seção eleitoral e os cruzamentos entre características
(como escolaridade × idade). Só idade × gênero estão cruzados, para a pirâmide etária. **Não há nenhum
dado individual de eleitor:** a base do TSE já é agregada, e aqui ela foi agregada ainda mais.

### Cruzamento TSE × IBGE

O código de município do TSE é diferente do código do IBGE, então as duas bases foram ligadas **pelo nome**,
depois de padronizar a grafia: sem acentos, tudo em maiúsculas, sem ponto, traço ou apóstrofo e com
espaços únicos (`DIAS D'ÁVILA` e `Dias d'Ávila` viram `DIAS D AVILA`). **Os 417 municípios casaram.**
Cada município guarda os dois códigos.

### Conferências

- Nenhum município sem par em nenhuma das bases.
- Soma dos eleitores por município = soma por local de votação = total do arquivo do TSE
  (**11.321.005 eleitores**).
- Soma da população dos municípios = população da Bahia na tabela do IBGE (**14.889.472 habitantes**).
- Qualquer código de categoria que não esteja no dicionário do TSE interrompe o processamento.

---

## Como ler os indicadores

- **Eleitores / Habitantes.** A população inclui crianças e adolescentes que não votam, então a razão
  costuma ficar abaixo de 100%. Na Bahia ela é de **76,0%**.
- **Acima de 100%** (▲ em vermelho) quer dizer mais eleitores cadastrados que habitantes estimados.
  Isso acontece em **24 municípios**. Pode vir de domicílio eleitoral diferente da residência (quem
  estuda ou trabalha fora e mantém o título na cidade de origem), de cadastro desatualizado ou da
  própria margem da estimativa. **É um indicador para investigar, não uma prova.**
- **Voto facultativo:** 16 e 17 anos e 70 anos ou mais. Obrigatório: 18 a 69 anos.
- **Estado civil e escolaridade** são os declarados no alistamento e podem estar desatualizados.
- **Autodeclarações** (raça/cor, identidade de gênero, quilombola, Libras) são campos recentes no cadastro:
  cerca de **81% do eleitorado ainda não as informou**. Os percentuais consideram só quem informou, e a
  tela mostra essa cobertura.
- **Biometria:** eleitores aptos com biometria cadastrada.
- **Eleitores com deficiência:** deficiência ou mobilidade reduzida, como registrado pelo TSE.

---

## Como funciona

- Site estático: HTML, CSS e JavaScript puros, sem servidor, sem banco de dados, sem etapa de build e
  sem serviços externos. Tudo roda no navegador.
- Gráficos com [Chart.js](https://www.chartjs.org/) 4.4.1, incluído em `vendor/`.
- Tema claro e escuro, com layout adaptado para celular.

### Estrutura

```
index.html              página única (Início e Análise Detalhada)
assets/css/             estilos
assets/js/core/         regras de cálculo (indicadores, filtros, formatação)
assets/js/views/        telas, tabelas e gráficos
assets/data/            dados já processados (JSON)
assets/img/             ícones
vendor/                 Chart.js
```

### Rodar localmente

A página carrega os dados por `fetch`, então precisa ser servida por HTTP (abrir o arquivo direto
no navegador não funciona). Qualquer servidor estático serve, por exemplo:

```
python -m http.server 8080
```

e abra http://localhost:8080.

---

Contato: atendimento@projetoagis.com · AGIS T.I

Licença [MIT](LICENSE). Bibliotecas de terceiros em [`vendor/LICENSES.md`](vendor/LICENSES.md).
