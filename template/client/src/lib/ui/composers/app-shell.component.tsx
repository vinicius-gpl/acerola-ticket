import { useGSAP } from '@gsap/react';
import { Link } from '@tanstack/react-router';
import { type ReactNode, useRef } from 'react';

import { BrandMark } from '../../brand/brand-mark';
import { highlightIn, popIn } from '../../motion/motion.util';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '../../vendor/ui/sidebar';
import { NAV_ITEMS, type NavItem } from '../navigation';
import { PersonAvatar } from '../primitives/person-avatar.component';

/**
 * A casca do sistema: menu à esquerda, conteúdo à direita.
 *
 * A composição segue a documentada pelo shadcn: `SidebarMenu` dentro de `SidebarGroup` ›
 * `SidebarGroupContent`; item ativo pelo `isActive` do próprio componente (é o que põe
 * `data-active` no botão); e o `SidebarTrigger` no CONTEÚDO — dentro da barra ele sumiria
 * junto com o que colapsa, e recolhida não haveria como expandir de volta.
 *
 * A `variant` é `inset`: a página herda a cor da barra, e o conteúdo flutua como um cartão
 * arredondado por cima. A cor vem dos tokens `--sidebar-*` em `lib/theme/tokens.css` — não de
 * `className` empilhada no componente baixado.
 *
 * Os itens vêm de `lib/ui/navigation.ts`. Tela nova no menu é uma linha lá, não aqui.
 */
export type AppShellProps = {
  children: ReactNode;
  data?: {
    /** Contador ao lado do item, pela `key` dele. Zero não desenha selo. */
    badges?: Partial<Record<string, number>>;
    user?: { name: string; email: string; role: string };
  };
  ui?: { items?: readonly NavItem[] };
  state?: { isCollapsed?: boolean; activeKey?: string };
};

export function AppShell({ children, data, ui, state }: AppShellProps) {
  const items = ui?.items ?? NAV_ITEMS;

  return (
    <SidebarProvider defaultOpen={!state?.isCollapsed}>
      {/* `collapsible="icon"` e não `offcanvas`: recolhida, a barra vira uma faixa de ícones.
          Sumir por inteiro tiraria da tela a única pista de onde estão as outras telas. */}
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader>
          <div className="flex items-center px-2 py-1.5 group-data-[collapsible=icon]:hidden">
            <BrandMark ui={{ size: 'sm' }} />
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <NavEntry
                    key={item.key}
                    item={item}
                    badge={data?.badges?.[item.key]}
                    isActive={state?.activeKey === item.key}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <UserEntry data={{ user: data?.user }} />
          {/* Não há botão "Sair": o template não tem login. Quem encerra a sessão é o provedor
              de identidade que fica na frente dele — um botão aqui prometeria um efeito que a
              aplicação não tem como cumprir. */}
        </SidebarFooter>

        {/* A borda arrastável: recolher também pela lateral, sem procurar o botão. */}
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="border-sidebar-border bg-background border">
        <header className="flex h-12 shrink-0 items-center gap-2 px-4">
          <SidebarTrigger />
        </header>

        <div className="min-w-0 flex-1">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function UserEntry({ data }: { data: { user?: { name: string; role: string } } }) {
  const name = data.user?.name ?? 'Visitante';

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" tooltip={name}>
          <PersonAvatar name={name} ui={{ size: 'md' }} />
          <span className="grid flex-1 text-left leading-tight">
            <span className="truncate text-sm font-semibold">{name}</span>
            <span className="truncate text-[10px] tracking-wider uppercase opacity-70">
              {data.user?.role ?? '—'}
            </span>
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function NavEntry({
  item,
  badge,
  isActive,
}: {
  item: NavItem;
  badge: number | undefined;
  isActive: boolean;
}) {
  const Icon = item.icon;
  const iconRef = useRef<SVGSVGElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);

  /* Ícone pulsa, fundo nasce com fade — só na TROCA para ativo. A dependência é `isActive`,
     então só dispara quando ele passa de `false` para `true`, nunca em re-render à toa. */
  useGSAP(() => {
    if (!isActive) return;

    popIn(iconRef.current);
    highlightIn(linkRef.current);
  }, [isActive]);

  return (
    <SidebarMenuItem>
      {/* `tooltip` é o que salva a barra recolhida: o ícone sozinho nem sempre diz o que é.
          O componente só o mostra quando está em modo ícone. */}
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={item.label}
        size="lg"
        className="text-base [&>svg]:size-5"
      >
        <Link ref={linkRef} to={item.to}>
          <Icon ref={iconRef} aria-hidden="true" />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>

      {/* Zero não vira selo: um "0" ao lado de cada item é ruído. O `SidebarMenuBadge` some
          sozinho quando a barra está recolhida. */}
      {badge ? (
        <SidebarMenuBadge className="bg-gradient-to-r from-rose-500 to-red-600 font-bold text-white shadow-lg shadow-rose-500/40">
          {badge}
        </SidebarMenuBadge>
      ) : null}
    </SidebarMenuItem>
  );
}
