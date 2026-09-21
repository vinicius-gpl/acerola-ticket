<script lang="ts" module>
  export type SelectFieldOption = { value: string; label: string };

  export type SelectFieldProps = {
    data: { value: string; options: SelectFieldOption[] };
    ui?: { placeholder?: string; ariaLabel?: string; className?: string };
    state?: { isDisabled?: boolean };
    actions: { onChange: (value: string) => void };
  };

  const EMPTY_VALUE = '__empty__';
</script>

<script lang="ts">
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '$lib/components/ui/select';
  import { cn } from '$lib/utils/cn.util';

  let { data, ui, state, actions }: SelectFieldProps = $props();

  const selectedValue = $derived(data.value === '' ? EMPTY_VALUE : data.value);
</script>

<Select
  type="single"
  value={selectedValue}
  onValueChange={(val: string | undefined) => {
    if (val !== undefined) {
      actions.onChange(val === EMPTY_VALUE ? '' : val);
    }
  }}
  disabled={state?.isDisabled}
>
  <SelectTrigger
    aria-label={ui?.ariaLabel}
    class={cn('h-auto rounded-sm py-2 text-sm', ui?.className)}
  >
    <SelectValue placeholder={ui?.placeholder} />
  </SelectTrigger>
  <SelectContent>
    {#each data.options as option (option.value || EMPTY_VALUE)}
      <SelectItem value={option.value || EMPTY_VALUE} label={option.label}>
        {option.label}
      </SelectItem>
    {/each}
  </SelectContent>
</Select>
