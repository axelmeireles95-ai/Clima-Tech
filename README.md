# CLIMA TECH V5

Versão com fotos e impressão profissional de Orçamentos e Ordens de Serviço.

## Novidades
- Fotos em Equipamentos, Orçamentos e Ordens de Serviço.
- Orçamento aprovado pode gerar OS automaticamente.
- Botão **Gerar PDF** em Orçamentos e OS. O navegador abre a versão pronta para impressão; escolha **Salvar como PDF** no diálogo de impressão para enviar ao cliente.
- Dados de cliente, equipamento, itens, valores, status e observações são organizados no documento.

## Supabase
A migração `supabase/schema_v4_migration.sql` deve ser executada uma única vez no SQL Editor.

## Deploy
Mantenha a estrutura `src/` e `supabase/` no GitHub. O Vercel faz o build a partir da branch `main`.
