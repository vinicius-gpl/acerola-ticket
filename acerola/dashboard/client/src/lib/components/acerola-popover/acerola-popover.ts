/**
 * A porta de entrada do `ui/popover` para os componentes de feature. Quem mora em
 * `routes/<feature>/components/` não pode importar `lib/components/ui` (é do CLI do shadcn, e
 * a fronteira é `lib/components`); importa daqui. Quando o projeto precisar de variante,
 * altura ou cor própria, é neste invólucro que ela entra — nunca no `ui/`.
 */
export {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '$lib/components/ui/popover';
