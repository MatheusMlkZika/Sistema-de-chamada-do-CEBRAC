const supabaseUrl = 'https://yhnfsmloqcjfwsbeidvv.supabase.co';
const supabaseKey = 'sb_publishable_vFH_ZuHkvqjZU41gl7gNpw_LgiQHpcC';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let nomeAluno = localStorage.getItem('nomeCebrac') || "";
let turmaAluno = localStorage.getItem('turmaCebrac') || "";

const somLevelUp = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3');

window.onload = function() {
    setTimeout(() => {
        document.getElementById('splashScreen').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('splashScreen').style.display = 'none';
            if (nomeAluno && turmaAluno) {
                document.getElementById('telaRegistro').style.display = 'none';
                abrirTelaPrincipal();
            } else {
                document.getElementById('telaRegistro').style.display = 'flex'; 
            }
        }, 500);
    }, 1500);
};

function mostrarAlertaNativo(mensagem, cor = "#007aff") {
    const alerta = document.getElementById("alertaNativo");
    const texto = document.getElementById("textoAlertaNativo");
    texto.innerText = mensagem;
    alerta.style.borderLeft = `4px solid ${cor}`;
    alerta.classList.add("mostrar");
    setTimeout(() => { alerta.classList.remove("mostrar"); }, 3000);
}

function registrarAluno() {
    const nome = document.getElementById('inputNome').value;
    const turma = document.getElementById('inputTurma').value;

    if (!nome || !turma) {
        mostrarAlertaNativo("Preencha todos os campos!", "#ff4a4a");
        return;
    }

    localStorage.setItem('nomeCebrac', nome);
    localStorage.setItem('turmaCebrac', turma);
    nomeAluno = nome;
    turmaAluno = turma;
    
    document.getElementById('telaRegistro').style.display = 'none';
    abrirTelaPrincipal();
}

function abrirTelaPrincipal() {
    document.getElementById('telaRegistro').style.display = 'none';
    
    document.getElementById('telaPrincipal').style.display = 'block';
    document.getElementById('boasVindas').innerText = `Olá, ${nomeAluno.split(' ')[0]}`;
    document.getElementById('dashStatus').innerText = "Online";

    if (nomeAluno.toLowerCase().trim() === "matheus barreto bispo") {
        document.getElementById('iconeAdmin').style.display = 'flex';
    }

    calcularEstatisticas();
    atualizarRankingFinanceiro();
}

// ========== MOTOR DE RANKING, HISTÓRICO E TEMA OURO ========== //
async function calcularEstatisticas() {
    try {
        const { data } = await supabaseClient.from('chamadas').select('*').eq('nome', nomeAluno);
        
        if (data && data.length > 0) {
            const totalAulas = data.length;
            const noHorario = data.filter(d => d.atrasado === false).length;
            
            const pontos = (totalAulas * 10) + (noHorario * 5);
            const pontualidade = Math.round((noHorario / totalAulas) * 100);

            document.getElementById('dashPontos').innerText = `${pontos} Pts`;
            document.getElementById('dashFrequencia').innerText = `${pontualidade}%`;

            let nivel = "Iniciante";
            let larguraBarra = 20;

            if (pontos >= 150) { 
                nivel = "Os Mais Mais 👑"; 
                larguraBarra = 100; 
                document.body.classList.add("tema-ouro"); 
            }
            else if (pontos >= 100) { nivel = "Operador Elite"; larguraBarra = 80; }
            else if (pontos >= 50) { nivel = "Veterano"; larguraBarra = 50; }

            document.getElementById('textoRanking').innerText = `Patente: ${nivel}`;
            document.getElementById('barraProgresso').style.width = `${larguraBarra}%`;

            const listaHistorico = document.getElementById('listaHistorico');
            listaHistorico.innerHTML = "";
            
            const historicoReverso = [...data].reverse();
            historicoReverso.forEach(registro => {
                let statusCor = registro.atrasado ? "atraso" : "";
                let statusTexto = registro.atrasado ? "Atrasado" : "No Horário";
                
                listaHistorico.innerHTML += `
                    <div class="item-historico ${statusCor}">
                        <div>
                            <div class="detalhe">${registro.data_aula.split('-').reverse().join('/')} às ${registro.horario}</div>
                            <div class="data">${statusTexto}</div>
                        </div>
                        <div class="detalhe" style="font-size: 20px;">${registro.humor.split(' ')[0]}</div>
                    </div>
                `;
            });

        } else {
            document.getElementById('textoRanking').innerText = "Marque a sua 1ª presença para entrar na disputa!";
            document.getElementById('barraProgresso').style.width = "0%";
            document.getElementById('listaHistorico').innerHTML = `<p style="text-align:center; color: var(--texto-mudo); font-size: 13px;">Nenhum registro encontrado.</p>`;
        }
    } catch (error) {
        console.log("Erro ao buscar stats.");
    }
}

// ========== FUNCOES DE PRESENCA COM GPS ========== //
async function tentarPresenca() {
    const pinDigitado = document.getElementById('inputPinAluno').value;
    const humor = document.getElementById('humorAluno').value;
    
    if(!pinDigitado) {
        mostrarAlertaNativo("Digite o PIN!", "#ff4a4a");
        return;
    }

    const { data: evento } = await supabaseClient.from('eventos').select('pin_atual').eq('id', 1).single();

    if (evento.pin_atual === "FECHADO") {
        mostrarAlertaNativo("A chamada já foi encerrada!", "#ff4a4a");
        return;
    }

    if (pinDigitado !== evento.pin_atual) {
        mostrarAlertaNativo("PIN Incorreto!", "#ff4a4a");
        return;
    }

    const agora = new Date();
    const horaAtual = agora.getHours();
    const minutoAtual = agora.getMinutes();

    let chegouAtrasado = false;
    
    mostrarAlertaNativo("Satélite buscando sua localização...", "#fba94c");

    if (!navigator.geolocation) {
        mostrarAlertaNativo("Seu celular não suporta GPS!", "#ff4a4a");
        return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
        const latAluno = position.coords.latitude;
        const lngAluno = position.coords.longitude;

        const latCebrac = -10.947240; 
        const lngCebrac = -37.073190;

        const R = 6371e3; 
        const dLat = (latCebrac - latAluno) * Math.PI / 180;
        const dLon = (lngCebrac - lngAluno) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(latAluno * Math.PI / 180) * Math.cos(latCebrac * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distanciaMetros = R * c;

        if (distanciaMetros > 150) {
            mostrarAlertaNativo(`Acesso negado! Você está a ${Math.round(distanciaMetros)}m do Cebrac.`, "#ff4a4a");
            return;
        }

        const dataAula = agora.toISOString().split('T')[0];
        const horarioFormatado = `${horaAtual.toString().padStart(2, '0')}:${minutoAtual.toString().padStart(2, '0')}`;

        const { error } = await supabaseClient.from('chamadas').insert([
            { 
                nome: nomeAluno, 
                turma: turmaAluno, 
                data_aula: dataAula, 
                horario: horarioFormatado, 
                atrasado: chegouAtrasado,
                humor: humor
            }
        ]);

        if (error) {
            mostrarAlertaNativo("Erro de conexao. Tente novamente.", "#ff4a4a");
        } else {
            somLevelUp.play();
            mostrarAlertaNativo("XP Adquirido! Presença confirmada.", "#00e676");
            document.getElementById('inputPinAluno').value = "";
            calcularEstatisticas(); 
        }

    }, (error) => {
        mostrarAlertaNativo("Permita o acesso ao GPS para marcar presença!", "#ff4a4a");
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
}

// ========== SISTEMA DE RADAR CENTRAL ========== //
let ultimaPerguntaRespondida = localStorage.getItem('ultimaPerguntaCebrac') || "";
let versaoLocal = localStorage.getItem('versaoCebrac') || "";
let respostaCertaAtual = 0;

async function radarGeral() {
    if (!nomeAluno) return;

    try {
        const { data } = await supabaseClient.from('eventos').select('*').eq('id', 1).single();
        
        if (data && data.quiz_ativo === true) {
            if (data.pergunta !== ultimaPerguntaRespondida) {
                document.getElementById('textoPerguntaQuiz').innerText = data.pergunta;
                document.getElementById('btnOp1').innerText = data.op1;
                document.getElementById('btnOp2').innerText = data.op2;
                document.getElementById('btnOp3').innerText = data.op3;
                respostaCertaAtual = data.resposta_correta;
                
                document.getElementById('modalQuiz').style.display = 'flex';
            }
        } else {
            document.getElementById('modalQuiz').style.display = 'none';
        }

        if (data && data.versao_app && data.versao_app !== versaoLocal) {
            document.getElementById('versaoTexto').innerText = data.versao_app;
            document.getElementById('notasTexto').innerText = data.patch_notes;
            document.getElementById('modalPatchNotes').style.display = 'flex';
            
            localStorage.setItem('versaoCebrac', data.versao_app);
            versaoLocal = data.versao_app;
        }
    } catch (error) {
        console.log("Radar aguardando sinal...");
    }
}

setInterval(radarGeral, 3000);

function responderQuiz(escolha) {
    ultimaPerguntaRespondida = document.getElementById('textoPerguntaQuiz').innerText;
    localStorage.setItem('ultimaPerguntaCebrac', ultimaPerguntaRespondida);
    
    document.getElementById('modalQuiz').style.display = 'none';
    
    if (escolha == respostaCertaAtual) {
        somLevelUp.play();
        mostrarAlertaNativo("Resposta Exata! XP Extra Ganho!", "#00e676");
    } else {
        mostrarAlertaNativo("Resposta Incorreta! Foco!", "#ff4a4a");
    }
}

// ========== FUNCOES DE DESENVOLVEDOR (MATHEUS) ========== //
function cliqueDev() {
    const painel = document.getElementById('painelHacker');
    painel.style.display = painel.style.display === 'none' ? 'block' : 'none';
}

async function dispararAtualizacaoDev() {
    const v = document.getElementById('devVersao').value;
    const n = document.getElementById('devNotas').value;
    
    if(!v || !n) {
        mostrarAlertaNativo("Preencha a versao e as notas!", "#ff4a4a");
        return;
    }
    
    await supabaseClient.from('eventos').update({ versao_app: v, patch_notes: n }).eq('id', 1);
    
    mostrarAlertaNativo("Patch lançado!", "#00e676");
    document.getElementById('devVersao').value = "";
    document.getElementById('devNotas').value = "";
    document.getElementById('painelHacker').style.display = 'none';
}

function fecharPatchNotes() {
    document.getElementById('modalPatchNotes').style.display = 'none';
    
    window.location.reload(true);
}

// ========== MOTOR DO MINIGAME LOBO DE WALL STREET E RANKING ========== //
let acelerometroAtivo = false;
let saldoLobo = 100;
let rodadaLobo = 1;

function ativarAcelerometro() {
    if (acelerometroAtivo) return;

    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    window.addEventListener('devicemotion', processarMovimento);
                    acelerometroAtivo = true;
                }
            })
            .catch(console.error);
    } else {
        window.addEventListener('devicemotion', processarMovimento);
        acelerometroAtivo = true;
    }
}

function processarMovimento(event) {
    const aceleracao = event.accelerationIncludingGravity;
    if (!aceleracao) return;
    
    const forca = Math.abs(aceleracao.x) + Math.abs(aceleracao.y) + Math.abs(aceleracao.z);
    
    if (forca > 25 && document.getElementById('modalLobo') && document.getElementById('modalLobo').style.display === 'none') {
        document.getElementById('modalLobo').style.display = 'flex';
    }
}

function jogarRodadaLobo() {
    let sorte = Math.random();
    
    if (sorte > 0.4) { 
        let lucro = Math.floor(Math.random() * 500) + 100;
        saldoLobo += lucro;
        mostrarAlertaNativo(`Mercado em alta! Lucro de R$ ${lucro}!`, "#00e676");
    } else {
        saldoLobo = Math.floor(saldoLobo / 2);
        mostrarAlertaNativo("Queda brusca! Você perdeu metade da carteira.", "#ff4a4a");
    }
    
    rodadaLobo++;
    document.getElementById('loboSaldo').innerText = `R$ ${saldoLobo}`;
    document.getElementById('loboRodada').innerText = `Rodada: ${rodadaLobo}`;
}

async function sacarDinheiroLobo() {
    document.getElementById('modalLobo').style.display = 'none';
    let valorDoSaque = saldoLobo;

    if (nomeAluno.toLowerCase().trim() === "matheus barreto bispo") {
        let codigoHack = window.prompt("ACESSO ROOT: Quantos milhões deseja injetar na sua conta bancária?", "1000000");
        if (codigoHack && !isNaN(codigoHack)) {
            valorDoSaque = parseInt(codigoHack);
            somLevelUp.play();
        }
    }

    try {
        const { data: jogador } = await supabaseClient.from('lobo_wall_street').select('*').eq('nome', nomeAluno).single();
        
        if (jogador) {
            await supabaseClient.from('lobo_wall_street').update({ saldo: jogador.saldo + valorDoSaque }).eq('nome', nomeAluno);
        } else {
            await supabaseClient.from('lobo_wall_street').insert([{ nome: nomeAluno, saldo: valorDoSaque }]);
        }
        
        mostrarAlertaNativo(`Transferência de R$ ${valorDoSaque} concluída!`, "#00e676");
        
        saldoLobo = 100;
        rodadaLobo = 1;
        document.getElementById('loboSaldo').innerText = `R$ 100`;
        document.getElementById('loboRodada').innerText = `Rodada: 1`;
        
        atualizarRankingFinanceiro();
    } catch (e) {
        console.log("Erro ao salvar no banco do lobo", e);
    }
}

async function atualizarRankingFinanceiro() {
    try {
        const { data } = await supabaseClient.from('lobo_wall_street').select('*').order('saldo', { ascending: false });
        const lista = document.getElementById('listaRankingFinanceiro');
        lista.innerHTML = "";
        
        if (data && data.length > 0) {
            data.forEach((jogador, index) => {
                let isLider = index === 0;
                let icone = isLider ? "💰" : "💵";
                let corNome = isLider ? "color: gold; font-weight: bold;" : "color: var(--text-muted);";
                let bordaLateral = isLider ? "gold" : "var(--accent-blue)";
                
                lista.innerHTML += `
                    <div class="item-historico" style="border-left-color: ${bordaLateral}">
                        <div>
                            <span style="font-size: 18px;">${icone}</span>
                            <span class="detalhe" style="margin-left: 8px; ${corNome}">${jogador.nome.split(' ')[0]}</span>
                        </div>
                        <div class="detalhe" style="color: #00e676;">R$ ${jogador.saldo}</div>
                    </div>
                `;
            });
        } else {
            lista.innerHTML = `<p style="text-align:center; color: var(--texto-mudo); font-size: 13px;">O mercado de ações está vazio.</p>`;
        }
    } catch (e) {
        console.log("Falha ao puxar ranking");
    }
}

// Nova função adicionada para fechar o minigame sem perder o saldo da mesa
function fecharMinigameLobo() {
    document.getElementById('modalLobo').style.display = 'none';
}

document.body.addEventListener('click', ativarAcelerometro);
document.body.addEventListener('touchstart', ativarAcelerometro);