# SGS-PE Web

Front-end do **SGS-PE (Sistema de Gestão de Sustentabilidade para Pequenas Empresas)**. Nele a empresa registra o consumo mensal de energia, água, resíduos e matérias-primas, acompanha a pegada de carbono, define metas, compara seu desempenho com o setor e gera relatórios em PDF e Excel.

Este projeto é só a interface. Ele depende da API do SGS-PE (projeto em ASP.NET Core), que precisa estar rodando antes.

## Requisitos

- **Node.js 20.19 ou mais recente** (ou 22.12+). Confira com `node -v`.
- **API do SGS-PE** rodando em `http://localhost:5101` com o perfil `http` (`dotnet run --launch-profile http`). O perfil `https` redireciona as chamadas e impede o front-end de se comunicar com a API.
- O primeiro administrador é criado pela API na inicialização, a partir das variáveis `Seed__AdminEmail` e `Seed__AdminPassword` (a senha precisa ter ao menos 8 caracteres). Veja o README da API.

## Como executar

```bash
npm install
npm start
```

Abra `http://localhost:4200` no navegador e entre com o e-mail e a senha do administrador.

A API libera (CORS) apenas `http://localhost:4200` e `http://localhost:3000` em desenvolvimento. Se usar outra porta, ajuste o CORS da API.

### Endereço da API

Fica em `src/environments/environment.ts`:

```ts
export const environment = { apiUrl: 'http://localhost:5101/api' };
```

Altere se a API estiver em outro endereço e reinicie o `npm start`.

### Gerar a versão de produção

```bash
npm run build
```

Os arquivos ficam em `dist/sgspe-web/browser/` e podem ser servidos por qualquer servidor de arquivos estáticos. Configure o servidor para devolver `index.html` em rotas desconhecidas (por exemplo `/dashboard`), pois a navegação é feita pelo próprio Angular.

## Primeiros passos

O administrador fica vinculado a uma empresa interna, sem indicadores próprios. Para colocar uma empresa cliente em uso:

1. **Entre como administrador.**
2. **Cadastre a empresa** em **Gestão > Empresas**: razão social, nome fantasia, setor e porte. Setor e porte são usados no benchmark.
3. **Crie o gestor da empresa** em **Gestão > Usuários**: informe nome, e-mail, senha (mínimo 6 caracteres), escolha a empresa e o perfil **Gestor**.
4. **Saia** (ícone no canto inferior do menu) e **entre com o gestor**.
5. Como gestor:
   - cadastre os **Equipamentos** da empresa;
   - lance os dados mensais em **Registros**;
   - crie **Metas**;
   - se quiser, crie **Colaboradores** em **Usuários** para que eles também lancem registros.
6. Acompanhe tudo pelo **Dashboard** e gere os documentos em **Relatórios**.

Para ver o sistema já preenchido, a API traz scripts de dados de demonstração (`scripts/seed_demo.py`), descritos no README dela.

## Perfis de acesso

| O que pode fazer | Administrador | Gestor | Colaborador |
|---|:-:|:-:|:-:|
| Ver dashboard, metas, notificações, equipamentos e carbono | ✓ | ✓ | ✓ |
| Lançar registros de consumo | ✓ | ✓ | ✓ |
| Excluir registros | ✓ | ✓ | |
| Cadastrar e excluir metas e equipamentos | ✓ | ✓ | |
| Benchmark e relatórios | ✓ | ✓ | |
| Criar usuários | ✓ | só Gestor e Colaborador da própria empresa | |
| Cadastrar empresas | ✓ | | |
| Visualizar qualquer empresa | ✓ | | |

Itens que o perfil não pode usar não aparecem no menu, e quem acessar essas telas pelo endereço é levado de volta ao dashboard. Colaboradores veem apenas as notificações das metas pelas quais são responsáveis.

## Guia das telas

### Entrar

Informe e-mail e senha. A sessão fica salva no navegador até você clicar em **Sair** ou até ela expirar; nesse caso o sistema volta para a tela de login.

### Seletor de empresa (somente administrador)

No topo do menu lateral, o campo **Empresa visualizada** define de qual empresa são os dados mostrados em todas as telas. No primeiro acesso, o sistema já abre a primeira empresa cliente cadastrada.

### Dashboard

Resumo de um mês. Por padrão mostra o último mês com dados; troque no campo **Período**.

- **Cartões de energia, água, resíduos e carbono**: valor do mês, variação em relação ao mês anterior e ao mesmo mês do ano anterior. Verde indica redução, vermelho indica aumento e amarelo indica variação de até 2%.
- **Gráfico de tendência**: os 12 meses até o período escolhido, com a linha dos 12 meses anteriores para comparação. Use as abas para trocar o indicador e passe o mouse sobre um mês para ver os valores. Abaixo do gráfico aparece o ODS relacionado ao indicador.
- **Alertas de metas**: metas em atenção, fora do alvo ou com prazo vencido no período.
- **Sugestões de melhoria**: recomendações geradas a partir dos dados do mês.

Sem nenhum registro, o dashboard mostra apenas um aviso para começar por **Registros**.

### Registros

Lançamento dos dados mensais. Escolha a aba (**Energia**, **Água**, **Resíduos** ou **Matérias-primas**), preencha mês, ano e os valores, e clique em **Adicionar**.

- **Energia**: consumo da rede e geração solar, em kWh.
- **Água**: consumo e água de chuva captada, em m³.
- **Resíduos**: quantidade em kg, tipo (orgânico, reciclável, perigoso, eletrônico, rejeito ou metal) e se foi reciclado. Resíduos não reciclados contam como aterro no cálculo de carbono.
- **Matérias-primas**: nome, unidade, quantidade e se o material é reciclado ou renovável.

Se o período já tiver sido lançado ou algum valor for inválido, a mensagem de erro aparece abaixo do formulário. Para corrigir um lançamento, exclua-o pelo ícone de lixeira (gestor ou administrador) e lance de novo.

### Equipamentos

Inventário usado para estimar o consumo de energia: nome, categoria, potência (W), quantidade e horas de uso por dia. O sistema calcula o consumo estimado em kWh/mês de cada item e o total dos equipamentos ativos. Use **Desativar** para tirar um equipamento do total sem apagá-lo.

### Carbono

Emissões de um mês em kg CO₂e, divididas entre energia, água e resíduos em aterro, com os fatores de emissão usados. Escolha mês e ano e clique em **Calcular**.

### Metas

Crie uma meta com título, indicador (energia, água, resíduos, carbono ou taxa de reciclagem), valor-alvo, prazo e, opcionalmente, um responsável. Para a taxa de reciclagem o alvo é um mínimo; para os demais indicadores é um máximo.

Cada meta mostra o valor atual do último mês com dados, a porcentagem em relação ao alvo e a situação: **No caminho**, **Atenção**, **Fora da meta** ou **Sem dados**.

### Notificações

Alertas gerados a partir das metas. O número de não lidas aparece no menu e no sino (no celular) e é atualizado a cada minuto. Gestores podem clicar em **Verificar metas agora** para gerar os alertas na hora. Use **Marcar como lida** ou **Marcar todas como lidas**.

### Benchmark

Compara os indicadores da empresa com a média de empresas do mesmo setor e porte em um mês. Escolha mês e ano e clique em **Comparar**. A comparação só aparece quando há um número mínimo de empresas comparáveis com dados; caso contrário, o sistema informa que ela está indisponível. O administrador também pode escolher outro porte ou **Todos os portes**.

### Relatórios

- **Relatório mensal**: escolha mês e ano e baixe em **PDF** ou **Excel**. Traz energia, água, resíduos, carbono, matérias-primas, metas e sugestões do mês.
- **Relatório anual de certificação**: escolha o ano-base e baixe o PDF com indicadores, emissões, metodologia, metas, alinhamento aos ODS e espaço para assinatura.

Os arquivos são salvos com a data e a hora da geração no nome, por exemplo `relatorio-2026-11-20_17-05-32.pdf`.

### Empresas (somente administrador)

Cadastro e lista das empresas atendidas. Depois de cadastrar uma empresa, crie o gestor dela em **Usuários**.

### Usuários

Cria usuários e lista os existentes. O administrador escolhe a empresa e qualquer perfil; o gestor cria apenas gestores e colaboradores da própria empresa. A senha precisa ter ao menos 6 caracteres e o e-mail não pode estar em uso.

### Tema

No menu lateral (e na tela de login) há a opção de tema **Claro**, **Escuro** ou **Sistema**, que segue a configuração do sistema operacional. A escolha fica salva no navegador.

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| "Não foi possível entrar" com e-mail e senha corretos | A API não está rodando, está em outro endereço ou foi iniciada com o perfil `https`. |
| Erro de CORS no console do navegador | O front-end está em uma porta diferente de 4200 ou a API não está no ambiente `Development`. |
| Dashboard vazio | A empresa visualizada ainda não tem registros. Lance dados em **Registros** ou, como administrador, confira a **Empresa visualizada**. |
| Benchmark indisponível | Não há empresas suficientes do mesmo setor e porte com dados no mês. |
| Volta para o login sozinho | A sessão expirou. Entre novamente. |

## Tecnologias

Angular 20 (componentes standalone e signals), TypeScript e SCSS, sem bibliotecas de interface ou de gráficos. Os gráficos são desenhados em SVG.
