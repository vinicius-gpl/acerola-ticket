/**
 * A porta de entrada do `ui/sheet` para os componentes de feature. Quem mora em
 * `routes/<feature>/components/` não pode importar `lib/components/ui` (é do CLI do shadcn, e
 * a fronteira é `lib/components`); importa daqui. Quando o projeto precisar de variante,
 * altura ou cor própria, é neste invólucro que ela entra — nunca no `ui/`.
 */
export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '$lib/components/ui/sheet';
