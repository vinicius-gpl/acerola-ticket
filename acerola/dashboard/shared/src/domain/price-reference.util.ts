/**
 * A REFERÊNCIA DE PREÇOS: quanto custa, mais ou menos, e onde procurar.
 *
 * Ela existe para ninguém começar a pesquisa do zero toda vez — era exatamente para isso que
 * o sistema antigo carregava essa lista.
 *
 * **É referência, não cotação.** Os valores são faixas anotadas numa data, e a tela mostra
 * essa data com destaque: preço de hardware muda de mês para mês, e um número velho
 * apresentado como certo é pior do que número nenhum na hora de pedir uma compra.
 *
 * Os links são buscas genéricas nas lojas, sem código de indicação e sem loja preferida.
 */

/** Quando esta lista foi conferida pela última vez. Mudou o preço? Mude esta data junto. */
export const PRICE_REFERENCE_UPDATED_AT = '2026-09-25';

export type PriceLink = { store: string; url: string };

export type PriceReference = {
  /** Liga o item à necessidade calculada, quando houver uma. */
  key: string;
  name: string;
  /** A faixa em reais: mínimo e máximo observados na data acima. */
  minPrice: number;
  maxPrice: number;
  links: PriceLink[];
};

export const PRICE_REFERENCES: PriceReference[] = [
  {
    key: 'memory',
    name: 'Memória DDR4 8 GB — desktop (UDIMM)',
    minPrice: 230,
    maxPrice: 430,
    links: [
      { store: 'Kabum', url: 'https://www.kabum.com.br/busca/memoria-ddr4-8gb' },
      { store: 'Mercado Livre', url: 'https://lista.mercadolivre.com.br/memoria-ddr4-8gb-desktop' },
      { store: 'Amazon', url: 'https://www.amazon.com.br/s?k=memoria+ddr4+8gb+desktop' },
    ],
  },
  {
    key: 'memory',
    name: 'Memória DDR4 8 GB — notebook (SO-DIMM)',
    minPrice: 240,
    maxPrice: 450,
    links: [
      { store: 'Kabum', url: 'https://www.kabum.com.br/busca/memoria-ddr4-8gb-notebook' },
      {
        store: 'Mercado Livre',
        url: 'https://lista.mercadolivre.com.br/memoria-ddr4-8gb-notebook',
      },
      { store: 'Amazon', url: 'https://www.amazon.com.br/s?k=memoria+ddr4+8gb+notebook' },
    ],
  },
  {
    key: 'disk',
    name: 'SSD 240 GB SATA 2,5"',
    minPrice: 250,
    maxPrice: 420,
    links: [
      { store: 'Kabum', url: 'https://www.kabum.com.br/busca/ssd-240gb' },
      { store: 'Mercado Livre', url: 'https://lista.mercadolivre.com.br/ssd-240gb-sata' },
      { store: 'Amazon', url: 'https://www.amazon.com.br/s?k=ssd+240gb+sata' },
    ],
  },
  {
    key: 'disk',
    name: 'SSD 480/500 GB NVMe M.2',
    minPrice: 300,
    maxPrice: 520,
    links: [
      { store: 'Kabum', url: 'https://www.kabum.com.br/busca/ssd-480gb-nvme' },
      { store: 'Mercado Livre', url: 'https://lista.mercadolivre.com.br/ssd-nvme-480gb' },
      { store: 'Amazon', url: 'https://www.amazon.com.br/s?k=ssd+nvme+480gb' },
    ],
  },
  {
    key: 'computer',
    name: 'Desktop corporativo — i5 de 9ª geração ou mais novo',
    minPrice: 2500,
    maxPrice: 6000,
    links: [
      { store: 'Dell', url: 'https://www.dell.com/pt-br/shop/desktop-e-all-in-one/scr/desktops' },
      { store: 'Mercado Livre', url: 'https://lista.mercadolivre.com.br/desktop-i5-9-geracao' },
      { store: 'Amazon', url: 'https://www.amazon.com.br/s?k=desktop+i5+9+geracao' },
    ],
  },
  {
    key: 'peripheral',
    name: 'Adaptador DisplayPort → VGA',
    minPrice: 30,
    maxPrice: 80,
    links: [
      { store: 'Kabum', url: 'https://www.kabum.com.br/busca/adaptador-displayport-vga' },
      { store: 'Mercado Livre', url: 'https://lista.mercadolivre.com.br/adaptador-displayport-vga' },
      { store: 'Amazon', url: 'https://www.amazon.com.br/s?k=adaptador+displayport+vga' },
    ],
  },
  {
    key: 'peripheral',
    name: 'Mouse USB',
    minPrice: 40,
    maxPrice: 110,
    links: [
      { store: 'Kabum', url: 'https://www.kabum.com.br/busca/mouse-usb' },
      { store: 'Mercado Livre', url: 'https://lista.mercadolivre.com.br/mouse-usb' },
      { store: 'Amazon', url: 'https://www.amazon.com.br/s?k=mouse+usb' },
    ],
  },
  {
    key: 'peripheral',
    name: 'Teclado USB ABNT2',
    minPrice: 70,
    maxPrice: 150,
    links: [
      { store: 'Kabum', url: 'https://www.kabum.com.br/busca/teclado-abnt2' },
      { store: 'Mercado Livre', url: 'https://lista.mercadolivre.com.br/teclado-usb-abnt2' },
      { store: 'Amazon', url: 'https://www.amazon.com.br/s?k=teclado+usb+abnt2' },
    ],
  },
];

/** As referências de um tipo de necessidade — é o que a tela mostra ao lado dela. */
export function referencesFor(key: string): PriceReference[] {
  return PRICE_REFERENCES.filter((reference) => reference.key === key);
}

/**
 * A faixa de preço de uma quantidade, em reais.
 *
 * Devolve mínimo e máximo, e nunca um número só: apresentar "R$ 1.380" para três pentes de
 * memória daria a uma estimativa a cara de uma cotação, e alguém levaria esse número para
 * uma reunião de orçamento.
 */
export function estimateFor(key: string, quantity: number): { min: number; max: number } | null {
  const references = referencesFor(key);
  if (references.length === 0 || quantity <= 0) return null;

  const min = Math.min(...references.map((reference) => reference.minPrice));
  const max = Math.max(...references.map((reference) => reference.maxPrice));

  return { min: min * quantity, max: max * quantity };
}
