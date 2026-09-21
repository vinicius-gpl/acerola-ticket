<script lang="ts">
	// Tela vazia: para onde o Go manda a janela (ver app.go, HideWindow) antes
	// de escondê-la de vez. Sem isso, a Popup ou o Dashboard ficavam montados
	// pra sempre em segundo plano — com todos os gráficos (uPlot) e popovers
	// de processo vivos — e a memória que o TrimWorkingSet acabou de devolver
	// ao Windows voltava a subir sozinha.
</script>
