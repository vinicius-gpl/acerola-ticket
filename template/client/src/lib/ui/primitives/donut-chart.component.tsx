import { Cell, Pie, PieChart } from 'recharts';

import { cn } from '../../utils/cn.util';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../../vendor/ui/chart';
import { type ChartSlice, colorOfSlice } from '../../utils/chart-slice.util';

/**
 * Rosca — para mostrar como um todo se divide (situação, categoria, cidade).
 *
 * Três coisas fazem o gráfico ser USADO e não só olhado:
 *
 *  1. **Legenda ao lado, com o nome escrito** — com o valor e a porcentagem junto.
 *  2. **O valor desenhado dentro da fatia**, com a porcentagem, e só quando a fatia passa de
 *     5% — abaixo disso o número não caberia e viraria borrão sobre a borda.
 *  3. **Clique na fatia abre o detalhamento** (`actions.onSelect`). O gráfico é o caminho para
 *     a lista, não um enfeite: é assim que alguém sai de "42 em andamento" para "quais 42".
 *
 * O total no MEIO do anel poupa a soma de cabeça.
 */
export type DonutChartProps = {
  data: {
    slices: ChartSlice[];
    /**
     * O nome da SÉRIE, que aparece dentro do popover: "Status: 10", e embaixo do total no
     * meio do anel.
     */
    seriesLabel: string;
  };
  state?: { isLoading?: boolean };
  ui?: { emptyLabel?: string };
  actions?: { onSelect?: (label: string) => void };
};

/** Abaixo disso o rótulo não cabe na fatia. */
const MIN_LABEL_PERCENT = 0.05;

export function DonutChart({ data, state, ui, actions }: DonutChartProps) {
  if (state?.isLoading) {
    return <div className="bg-muted h-full w-full animate-pulse rounded-lg" />;
  }

  if (data.slices.length === 0) {
    return (
      <p className="text-muted-foreground flex h-full items-center justify-center text-xs">
        {ui?.emptyLabel ?? 'Sem dados para mostrar'}
      </p>
    );
  }

  const total = data.slices.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <div className="flex h-full items-center gap-4">
      {/* Quadrado próprio para a rosca: sem ele, a legenda ao lado empurra o centro do
          anel para fora do meio visual do cartão, e o total sobreposto fica desalinhado. */}
      <div className="relative aspect-square h-full shrink-0">
        <ChartContainer
          config={{ value: { label: data.seriesLabel } }}
          className="aspect-auto h-full w-full"
        >
          <PieChart>
            {/* Título = a fatia, corpo = "Série: valor". `labelFormatter` pega o nome direto
                do payload (`slice.label`, ex.: "Em andamento") — o cruzamento automático de
                `labelKey`/`config` do componente não resolve sozinho quando o nome da fatia
                não está cadastrado no `config`, e o título saía em branco. O `className` só
                toca o CONTÊINER (raio maior, sombra mais macia, sem a borda fina que brigava
                com o fundo) — o texto de dentro continua com as cores semânticas do próprio
                `ChartTooltipContent`, que já têm contraste correto sozinhas. */}
            <ChartTooltip
              content={
                <ChartTooltipContent
                  nameKey="value"
                  labelFormatter={(_, tooltipPayload) =>
                    (tooltipPayload?.[0]?.payload as ChartSlice | undefined)?.label ?? ''
                  }
                  className="bg-card rounded-xl border-none px-3 py-2.5 shadow-lg ring-1 ring-black/5"
                />
              }
            />
            <Pie
              data={data.slices}
              dataKey="value"
              nameKey="label"
              innerRadius="62%"
              outerRadius="100%"
              paddingAngle={1}
              /* Anel de 2px na cor da superfície: sem ele, duas fatias de tom próximo
                 encostam e viram uma só. */
              stroke="var(--color-card)"
              strokeWidth={2}
              labelLine={false}
              label={renderSliceLabel}
              onClick={(slice: unknown) => actions?.onSelect?.(readLabel(slice))}
              className={actions?.onSelect ? 'cursor-pointer' : undefined}
            >
              {data.slices.map((slice, index) => (
                <Cell key={slice.label} fill={colorOfSlice(slice.label, index)} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-foreground text-xl leading-tight font-bold">
            {total.toLocaleString('pt-BR')}
          </span>
          <span className="text-muted-foreground text-[10px] tracking-wide uppercase">
            {data.seriesLabel}
          </span>
        </div>
      </div>

      {/* `self-stretch`: sem isso a lista fica `items-center` do pai, que dá a ela só a
          própria altura de conteúdo — e com 13 status o `overflow-y-auto` nunca entra em
          ação, e a lista extravasa o cartão por baixo. */}
      <ul className="min-w-0 flex-1 space-y-2.5 self-stretch overflow-y-auto pr-1">
        {data.slices.map((slice, index) => {
          const color = colorOfSlice(slice.label, index);
          const percent = total > 0 ? Math.round((slice.value / total) * 100) : 0;

          return (
            <li key={slice.label}>
              <button
                type="button"
                onClick={() => actions?.onSelect?.(slice.label)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-left text-xs',
                  actions?.onSelect ? 'hover:bg-muted' : undefined,
                )}
              >
                <span
                  className="size-2 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <span className="text-muted-foreground w-20 shrink-0 truncate" title={slice.label}>
                  {slice.label}
                </span>
                {/* Barrinha de progresso — não é `ProgressBar` (esse componente é pra "quanto
                    já foi cumprido de uma obrigação", com tom por faixa de conclusão:
                    vermelho/amarelo/verde, independente de QUEM é o status). Aqui a cor tem
                    que ser a mesma do ponto e da fatia — a identidade da categoria, não uma
                    leitura de "isso está bom ou ruim". */}
                <span className="bg-muted h-1.5 min-w-8 flex-1 overflow-hidden rounded-full">
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${percent}%`, backgroundColor: color }}
                  />
                </span>
                <span className="text-foreground shrink-0 font-semibold">{slice.value}</span>
                <span className="text-muted-foreground w-9 shrink-0 text-right">{percent}%</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type SliceLabelProps = {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  value: number;
};

/** O valor e a porcentagem no meio da fatia, em branco com sombra. */
function renderSliceLabel(props: unknown) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent, value } = props as SliceLabelProps;
  if (percent < MIN_LABEL_PERCENT) return null;

  const radius = innerRadius + (outerRadius - innerRadius) / 2;
  const radians = (-midAngle * Math.PI) / 180;

  return (
    <text
      x={cx + radius * Math.cos(radians)}
      y={cy + radius * Math.sin(radians)}
      textAnchor="middle"
      dominantBaseline="middle"
      className="pointer-events-none fill-white text-[11px] font-semibold [paint-order:stroke]"
      stroke="rgba(0,0,0,.25)"
      strokeWidth={2}
    >
      {`${value} (${Math.round(percent * 100)}%)`}
    </text>
  );
}

function readLabel(slice: unknown): string {
  const payload = slice as { label?: string; payload?: { label?: string } };

  return payload.label ?? payload.payload?.label ?? '';
}
