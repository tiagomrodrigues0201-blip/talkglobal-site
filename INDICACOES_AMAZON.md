# Vitrine de afiliados TalkGlobal — manutenção

Página: `/indicacoes/` (em revisão, sem publicação em produção). Identificador já existente: `talkglobal0a-20`.

## Fonte de dados e atualização em lote

O arquivo `data/amazon-products.csv` é a base de importação em lote; `npm run import:amazon` valida e gera `data/amazon-products.json`. Publicar **ambos** no mesmo commit. A vitrine exibe somente os registros ativos do JSON gerado. A configuração de afiliados fornece o identificador, sem acrescentar cartões antigos.

Cabeçalhos CSV: `id,title,category,for_whom,why,limitations,experience,url,active,demonstration,kind,source_url`.

- `category`: `trabalho`, `viagem`, `criacao`, `leitura`, `outros`.
- `experience`: `usamos` somente se há experiência pessoal real; caso contrário, `pesquisado`.
- `url`: opcional. Se preenchida, precisa ser HTTPS da Amazon Brasil com `tag=talkglobal0a-20`, preferencialmente gerada no portal de associados. Sem URL, o cartão pesquisa pelo título na Amazon (sem informação sobre um produto específico).
- `active`: use `false` para excluir item da próxima geração.
- Nunca alimentar `image_url` por extração ou cópia sem autorização. O importador a rejeita.
- O catálogo não captura nem atualiza preços, avaliações, promoções ou disponibilidade.
- O primeiro lote contém sete recomendações editoriais (quatro modelos e três categorias), sem experiência de uso confirmada. Os links atuais são de pesquisa; fotos e links individuais continuam pendentes.

Para adicionar dezenas de itens, basta colar linhas na planilha CSV, importar uma vez e atualizar a branch. Executar `node tests/amazon-catalog.test.mjs` e validar os links com o Link Checker no Portal de Associados.

## Amazon API e imagens

A Creators API requer aprovação/credenciais e elegibilidade confirmadas na própria conta. **Não colocar chaves no GitHub**, nem prometer sincronização sem acesso. Fotos, preços e informações comerciais somente via fonte permitida e observando a política de cache/atualização em vigor.

## Lista de aprovação pré-publicação

- [ ] Confirmar no portal de associados se `talkglobalapp.com` está cadastrado.
- [ ] Confirmar conta com aceitação final e elegibilidade Creators API.
- [ ] Validar os links e a tag no verificador oficial.
- [ ] Validar preview Vercel em desktop e celular, filtros, navegação e links.
- [ ] Revisar exemplos da planilha e selecionar itens editoriais reais.
- [ ] Testar Freela PT/ES, checkout, entrega privada e demais páginas.
- [ ] Confirmar revisão do proprietário antes de fazer merge ou publicar.
- [ ] Remover `noindex` somente após aceitação e verificação final.
