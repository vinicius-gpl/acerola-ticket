<script lang="ts" module>
  import { departmentLabel } from '@template/shared/domain/department.util';
  import {
    PERIPHERAL_DESTINIES,
    peripheralDestinyLabel,
    type PeripheralDestiny,
  } from '@template/shared/domain/transfer.util';
  import { type Computer } from '@template/shared/schemas/computer.schema';

  export type DepartmentOption = { value: string; label: string };

  export type MachineOption = { value: string; label: string };

  export type PeripheralChoice = {
    partId: number;
    label: string;
    quantity: number;
    destiny: PeripheralDestiny;
    destinationComputerId: string;
  };

  /**
   * TRANSFERIR a máquina de departamento, num modal.
   *
   * A pergunta dos periféricos é o coração desta tela, e não um detalhe: na prática quem
   * troca de computador deixa teclado, mouse e monitor na mesa. Sem perguntar, o depósito
   * passaria a dizer que essas peças foram embora com a máquina.
   *
   * Função pura de props: não busca nada e não navega. Por isso abre no Storybook com peças,
   * sem peças, carregando e com o destino em falta.
   */
  export type TransferDialogProps = {
    data: {
      computer: Computer;
      toDepartment: string;
      responsible: string;
      note: string;
      departments: DepartmentOption[];
      machines: MachineOption[];
      peripherals: PeripheralChoice[];
    };
    state: {
      isOpen: boolean;
      isSubmitting?: boolean;
      isLoadingPeripherals?: boolean;
      isIncomplete?: boolean;
      error?: string | null;
    };
    actions: {
      onDepartmentChange: (value: string) => void;
      onResponsibleChange: (value: string) => void;
      onNoteChange: (value: string) => void;
      onDestinyChange: (partId: number, destiny: PeripheralDestiny) => void;
      onDestinationChange: (partId: number, computerId: string) => void;
      onSubmit: () => void;
      onClose: () => void;
    };
  };

  /** Onde a máquina está hoje, escrito como quem pergunta: "está no financeiro". */
  export function currentPlaceOf(computer: Computer): string {
    return computer.department
      ? departmentLabel(computer.department)
      : 'Sem departamento (na prateleira)';
  }

  export function machineLabelOf(computer: Computer): string {
    return computer.displayName?.trim() || computer.name;
  }

  /** A peça e quantas unidades dela estão na máquina. */
  export function peripheralLabelOf(peripheral: PeripheralChoice): string {
    return peripheral.quantity > 1
      ? `${peripheral.label} (${peripheral.quantity})`
      : peripheral.label;
  }
</script>

<script lang="ts">
  import ActionButton from '$lib/components/action-button/action-button.svelte';
  import ErrorState from '$lib/components/error-state/error-state.svelte';
  import SelectField from '$lib/components/select-field/select-field.svelte';
  import SubmitButton from '$lib/components/submit-button/submit-button.svelte';
  import TextAreaField from '$lib/components/text-area-field/text-area-field.svelte';
  import TextField from '$lib/components/text-field/text-field.svelte';
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/ui/dialog';

  let { data, state: dialogState, actions }: TransferDialogProps = $props();

  const goingToShelf = $derived(data.toDepartment === '');

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    actions.onSubmit();
  }
</script>

<Dialog
  open={dialogState.isOpen}
  onOpenChange={(isOpen: boolean) => (isOpen ? undefined : actions.onClose())}
>
  <DialogContent>
    <form novalidate class="flex flex-col gap-4" onsubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Transferir de departamento</DialogTitle>
        <DialogDescription>
          {machineLabelOf(data.computer)} · hoje em <strong>{currentPlaceOf(data.computer)}</strong>
        </DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-1.5">
        <span class="text-ink-700 text-sm font-medium">Para onde vai</span>
        <SelectField
          data={{ value: data.toDepartment, options: data.departments }}
          ui={{ ariaLabel: 'Para onde vai' }}
          state={{ isDisabled: dialogState.isSubmitting }}
          actions={{ onChange: actions.onDepartmentChange }}
        />
        {#if goingToShelf}
          <span class="text-ink-500 text-xs">
            A máquina volta a ser reserva: ela perde o responsável e passa a se chamar
            "Reserva — {data.computer.name}".
          </span>
        {/if}
      </div>

      <TextField
        data={{
          label: 'Quem levou',
          name: 'responsible',
          value: data.responsible,
          placeholder: 'Quem acompanhou a mudança',
        }}
        state={{ isDisabled: dialogState.isSubmitting }}
        actions={{ onChange: actions.onResponsibleChange }}
      />

      <TextAreaField
        data={{
          label: 'Observação',
          name: 'note',
          value: data.note,
          placeholder: 'Por que a máquina mudou de lugar',
        }}
        state={{ isDisabled: dialogState.isSubmitting }}
        actions={{ onChange: actions.onNoteChange }}
      />

      <!-- Periféricos: o que vai junto e o que fica na mesa. -->
      {#if dialogState.isLoadingPeripherals}
        <p class="text-ink-500 text-xs">Vendo quais peças estão nesta máquina…</p>
      {:else if data.peripherals.length > 0}
        <fieldset class="flex flex-col gap-2 rounded-lg border p-3">
          <legend class="text-ink-700 px-1 text-sm font-medium">
            Peças nesta máquina — o que vai junto?
          </legend>

          {#each data.peripherals as peripheral (peripheral.partId)}
            <div class="flex flex-col gap-1 border-t pt-2 first:border-t-0 first:pt-0">
              <span class="text-ink-900 text-sm">{peripheralLabelOf(peripheral)}</span>

              <div class="flex flex-wrap items-center gap-3">
                {#each PERIPHERAL_DESTINIES as destiny (destiny)}
                  <label class="text-ink-700 flex items-center gap-1.5 text-xs">
                    <input
                      type="radio"
                      name={`destiny-${peripheral.partId}`}
                      value={destiny}
                      checked={peripheral.destiny === destiny}
                      disabled={dialogState.isSubmitting}
                      onchange={() => actions.onDestinyChange(peripheral.partId, destiny)}
                    />
                    {peripheralDestinyLabel(destiny)}
                  </label>
                {/each}
              </div>

              {#if peripheral.destiny === 'station'}
                <SelectField
                  data={{
                    value: peripheral.destinationComputerId,
                    options: [{ value: '', label: '— máquina que assume —' }, ...data.machines],
                  }}
                  ui={{ ariaLabel: `Máquina que assume ${peripheral.label}` }}
                  state={{ isDisabled: dialogState.isSubmitting }}
                  actions={{
                    onChange: (value: string) =>
                      actions.onDestinationChange(peripheral.partId, value),
                  }}
                />
              {/if}
            </div>
          {/each}
        </fieldset>
      {/if}

      {#if dialogState.isIncomplete}
        <p class="text-xs text-amber-700">
          Falta dizer qual máquina assume a peça que fica na estação.
        </p>
      {/if}

      {#if dialogState.error}
        <ErrorState data={{ title: 'Não consegui transferir', message: dialogState.error }} />
      {/if}

      <DialogFooter>
        <ActionButton
          data={{ label: 'Cancelar' }}
          ui={{ variant: 'secondary' }}
          state={{ isDisabled: dialogState.isSubmitting }}
          actions={{ onClick: actions.onClose }}
        />
        <SubmitButton
          data={{ label: 'Transferir', loadingLabel: 'Transferindo…' }}
          state={{
            isLoading: dialogState.isSubmitting,
            isDisabled: dialogState.isIncomplete,
          }}
        />
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
