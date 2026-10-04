/**
 * A porta de entrada do `ui/table` para os componentes de feature. Quem mora em
 * `routes/<feature>/components/` não pode importar `lib/components/ui` (é do CLI do shadcn, e
 * a fronteira é `lib/components`); importa daqui. Quando o projeto precisar de variante,
 * altura ou cor própria, é neste invólucro que ela entra — nunca no `ui/`.
 */
export {
  Table,
  TableActions,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '$lib/components/ui/table';
