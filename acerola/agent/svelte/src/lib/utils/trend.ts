// Delta simples entre a amostra atual e a anterior — usado pelos chips de
// tendência (padrão de "KPI tile" tipo ReUI: valor grande + selo de
// tendência). Sem juízo de "bom"/"ruim": CPU alta não é necessariamente
// ruim, então o tom é só visual (sobe/desce), não semáforo.
export type Trend = {
	direction: 'up' | 'down' | 'flat';
	delta: number;
};

export function trend(current: number, previous: number | undefined): Trend {
	if (previous === undefined) return { direction: 'flat', delta: 0 };
	const delta = current - previous;
	if (Math.abs(delta) < 0.05) return { direction: 'flat', delta };
	return { direction: delta > 0 ? 'up' : 'down', delta };
}
