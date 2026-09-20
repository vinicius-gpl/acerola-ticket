import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../vendor/ui/select';
import { cn } from '../../utils/cn.util';

export type SelectFieldOption = { value: string; label: string };

/**
 * `<select>` nativo trocado pelo Select do shadcn/ui — mesmo comportamento (uma opção,
 * `onChange` com o valor), mas o menu e o destaque de foco ficam iguais em qualquer
 * navegador, em vez de herdar o estilo do sistema operacional.
 *
 * Radix não aceita `value=""` num item (é o sentinel dele para "nenhuma seleção"), então
 * a opção "vazia" (Todos, Não preenchido...) troca de string vazia para `EMPTY_VALUE` só
 * aqui dentro. Quem chama continua vendo `''` — o desvio não vaza para o resto do app.
 */
export type SelectFieldProps = {
  data: { value: string; options: SelectFieldOption[] };
  ui?: { placeholder?: string; ariaLabel?: string; className?: string };
  state?: { isDisabled?: boolean };
  actions: { onChange: (value: string) => void };
};

const EMPTY_VALUE = '__empty__';

export function SelectField({ data, ui, state, actions }: SelectFieldProps) {
  return (
    <Select
      value={data.value === '' ? EMPTY_VALUE : data.value}
      onValueChange={(value) => actions.onChange(value === EMPTY_VALUE ? '' : value)}
      disabled={state?.isDisabled}
    >
      <SelectTrigger
        aria-label={ui?.ariaLabel}
        className={cn('h-auto rounded-sm py-2 text-sm', ui?.className)}
      >
        <SelectValue placeholder={ui?.placeholder} />
      </SelectTrigger>
      <SelectContent>
        {data.options.map((option) => (
          <SelectItem key={option.value || EMPTY_VALUE} value={option.value || EMPTY_VALUE}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
