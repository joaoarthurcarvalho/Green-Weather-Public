"use strict";

const nomesDiasRelogio = [
  "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
  "Quinta-feira", "Sexta-feira", "Sábado"
];

function atualizarRelogio() {
  const dia = document.getElementById("dia");
  const data = document.getElementById("data");
  const hora = document.getElementById("hora");
  if (!dia || !data || !hora) return;

  const agora = new Date();
  const doisDigitos = valor => String(valor).padStart(2, "0");
  dia.textContent = nomesDiasRelogio[agora.getDay()];
  data.textContent = `${doisDigitos(agora.getDate())}/${doisDigitos(agora.getMonth() + 1)}/${agora.getFullYear()}`;
  hora.textContent = `${doisDigitos(agora.getHours())}:${doisDigitos(agora.getMinutes())}`;
}

atualizarRelogio();
setInterval(atualizarRelogio, 1000);
