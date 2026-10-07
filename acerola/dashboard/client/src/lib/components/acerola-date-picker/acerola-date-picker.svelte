<script lang="ts">
  import {
    DateFormatter,
    type DateValue,
    getLocalTimeZone,
    parseDate,
  } from "@internationalized/date";
  import { Calendar as CalendarIcon } from "lucide-svelte";
  import { cn } from "$lib/utils/cn";
  import { Button } from "$lib/components/ui/button";
  import { Calendar } from "$lib/components/ui/calendar";
  import * as Popover from "$lib/components/ui/popover";

  let {
    value = $bindable(),
    placeholder = "Selecione uma data",
    disabled = false,
    class: className,
    name,
    ariaLabel,
    onValueChange,
  }: {
    value?: string | DateValue | null;
    placeholder?: string;
    disabled?: boolean;
    class?: string;
    name?: string;
    ariaLabel?: string;
    onValueChange?: (val: string | null) => void;
  } = $props();

  const df = new DateFormatter("pt-BR", {
    dateStyle: "medium",
  });

  let internalDate: DateValue | undefined = $state.raw(undefined);

  $effect(() => {
    if (!value) {
      internalDate = undefined;
      return;
    }
    if (typeof value !== "string") {
      internalDate = value;
      return;
    }

    const clean = value.split("T")[0] ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return;

    try {
      internalDate = parseDate(clean);
    } catch {
      internalDate = undefined;
    }
  });

  function handleSelect(newVal: DateValue | undefined) {
    internalDate = newVal;
    if (newVal) {
      const isoStr = newVal.toString();
      value = isoStr;
      onValueChange?.(isoStr);
    } else {
      value = null;
      onValueChange?.(null);
    }
  }

  let displayLabel = $derived.by(() => {
    if (internalDate) {
      return df.format(internalDate.toDate(getLocalTimeZone()));
    }
    return placeholder;
  });
</script>

<div class={cn("relative inline-block w-full", className)}>
  <input
    type="text"
    class="sr-only"
    tabindex="-1"
    {name}
    aria-label={ariaLabel}
    value={typeof value === 'string' ? value : (internalDate ? internalDate.toString() : '')}
    readonly
  />
  <Popover.Root>
    <Popover.Trigger>
      {#snippet child({ props })}
        <!-- `props` (do Bits UI) vem PRIMEIRO, não por último: ele carrega o próprio `class`
             do trigger, e espalhado depois do nosso apagava a altura e o resto do estilo aqui
             embaixo sem erro nenhum no console — o botão só voltava ao tamanho padrão. -->
        <Button
          {...props}
          variant="outline"
          class={cn(
            "w-full justify-start text-left font-normal h-10 px-3.5 rounded-control border-border bg-card hover:bg-accent/40 shadow-xs transition-colors",
            !internalDate && "text-muted-foreground"
          )}
          {disabled}
        >
          <CalendarIcon class="mr-2.5 size-4 text-muted-foreground" />
          <span class="truncate">{displayLabel}</span>
        </Button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content class="w-auto p-0 rounded-surface border-border bg-card shadow-xl" align="start">
      <Calendar
        type="single"
        value={internalDate}
        onValueChange={handleSelect}
        locale="pt-BR"
        captionLayout="dropdown"
        class="rounded-control border-0 p-3"
      />
    </Popover.Content>
  </Popover.Root>
</div>
