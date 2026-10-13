# Vitrine Amazon — revisão de 13/10/2026

## Confirmado
- Importador executado: sete registros; JSON gerado pelo CSV.
- Corrigida a renderização de 21 cartões (sete novos + 14 legados). O catálogo agora usa somente o lote ativo.
- Teste automatizado cobre sete cartões, filtros, uma única carga JSON, identificação dos links e erro explícito.
- Deploy 1ee1e7f41a7c78742b93c12efbc5a7ff64881277 READY e aberto em navegador gráfico.
- Cliques reais nos filtros: Trabalho 3; Viagem 2; Criação 1; Livros 1; Tudo 7.
- Tela estreita testada em iframe de 390px (375px úteis): largura do documento e scrollWidth = 375, sem overflow horizontal. Filtro Viagem mostra dois cartões. Não equivale a teste em telefone físico.
- Main segue 69ccc964108c2e9c2f98eb45ab0602b7e01f43b7. Nenhuma alteração nos arquivos Freela PT/ES, scripts de pagamento ou API/licenças.
- 32 testes automatizados de idioma, checkout, Pix e entrega licenciada passaram novamente. Nenhuma cobrança real; esta rodada não reexecutou webhook externo ou pagamento real.
- Harness temporário de mobile removido da branch após a verificação.

## Pendências concretas
- Portal Amazon abriu, mas ao iniciar sessão apresentou: “Não oferecemos suporte à sua sessão ou cliente”. Login não concluído; nenhuma credencial inserida.
- Cadastro do domínio, aprovação final e elegibilidade API não confirmados.
- Quatro links individuais oficiais e fotografias autorizadas ainda ausentes. Links existentes continuam sendo buscas identificadas, sem afirmar disponibilidade.
- Ilustrações de categoria são provisórias. Não há fotos comerciais licenciadas.
- Importação permanece por lote/CSV executado pelo responsável. Não há conexão automática com planilha externa.

Não publicar nem remover noindex enquanto os requisitos da conta e a apresentação final estiverem pendentes.
