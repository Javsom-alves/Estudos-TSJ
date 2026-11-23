# Controle de estudos — Escrevente TJ-SP

App para acompanhar o cronograma de 16 semanas (2 horas por dia) para o concurso de Escrevente Técnico Judiciário do TJ-SP (Vunesp), com prova em 14/03/2027.

## O que ele faz

- **Hoje:** os dois blocos de estudo do dia, com registro de questões e acertos.
- **Cronograma:** as 16 semanas, bloco a bloco, com progresso por semana.
- **Desempenho:** percentual de acertos por matéria e comparação com os mínimos da prova (50% em Português e em Direito).
- **Notas:** checklist e anotações de cada semana, com backup dos dados.

## Como usar

Abra o `index.html` no navegador ou acesse a versão publicada no GitHub Pages.

O progresso fica salvo no navegador (localStorage) de cada aparelho e não é enviado para nenhum servidor. Use **Notas › Baixar backup** para guardar uma cópia.

## Estrutura

```
index.html      página principal
css/style.css   aparência (modo claro e escuro)
js/data.js      cronograma das 16 semanas (edite aqui os assuntos)
js/app.js       funcionamento do app
```

Para mudar um assunto do cronograma, edite o `js/data.js`.
