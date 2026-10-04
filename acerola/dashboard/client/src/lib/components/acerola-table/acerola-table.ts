/**
 * A porta de entrada da tabela para as telas: a superfície (`Table`) e as peças já com a
 * aparência da casa. Quem mora em `routes/<feature>/components/` não pode importar
 * `lib/components/ui` (é do CLI do shadcn); importa daqui.
 *
 * `TableBody` e `TableCaption` vêm direto do `ui/table`: não têm nada nosso por cima.
 */
export { default as Table } from './acerola-table.svelte';
export { default as TableActions } from './acerola-table-actions.svelte';
export { default as TableCell } from './acerola-table-cell.svelte';
export { default as TableFooter } from './acerola-table-footer.svelte';
export { default as TableHead } from './acerola-table-head.svelte';
export { default as TableHeader } from './acerola-table-header.svelte';
export { default as TableRow } from './acerola-table-row.svelte';
export { TableBody, TableCaption } from '$lib/components/ui/table';
